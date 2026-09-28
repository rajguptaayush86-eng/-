import { useState, useEffect, useRef } from "react";

// ExamForge Free v6 - Official Exam UIs + Working Upgrade + Fixed Palette

const CTRL_KEY = "EXAM_PLATFORM_CTRL_v1";
const LS = {
  get:(k,d=null)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):d;}catch{return d;}},
  set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch{}},
  del:(k)=>{try{localStorage.removeItem(k);}catch{}},
};
const QS={NV:"not_visited",NA:"not_answered",ANS:"answered",MR:"marked_review",AM:"answered_marked"};
const sha256=async(s)=>{const buf=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");};
const fmt2=(s)=>`${String(Math.floor(s/3600)).padStart(2,"0")}:${String(Math.floor((s%3600)/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
const fmtMin=(s)=>`${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

function useTimer(totalSec, onEnd){
  const [left,setLeft]=useState(totalSec);
  const doneRef=useRef(false);
  const leftRef=useRef(totalSec);
  useEffect(()=>{
    const id=setInterval(()=>{
      setLeft(p=>{
        const n=p-1; leftRef.current=n;
        if(n<=0&&!doneRef.current){doneRef.current=true;clearInterval(id);onEnd();}
        return Math.max(0,n);
      });
    },1000);
    return()=>clearInterval(id);
  },[]);
  return {left,leftRef,fmt:fmt2(left),fmt2:fmtMin(left),warn:left<300,crit:left<60};
}

// ============================================================
// EXAM DATABASE
// ============================================================
const EXAMS=[
  // Indian Exams
  {id:"JEE_MAIN",name:"JEE Main",country:"India",cat:"Engineering",subj:["Physics","Chemistry","Mathematics"],totalQ:90,dur:180,marks:300,neg:1,pos:4,ui:"NTA",color:"#1a237e"},
  {id:"JEE_ADV",name:"JEE Advanced",country:"India",cat:"Engineering",subj:["Physics","Chemistry","Mathematics"],totalQ:54,dur:180,marks:180,neg:2,pos:3,ui:"NTA_ADV",color:"#880e4f"},
  {id:"NEET",name:"NEET UG",country:"India",cat:"Medical",subj:["Physics","Chemistry","Biology"],totalQ:180,dur:200,marks:720,neg:1,pos:4,ui:"NTA",color:"#1b5e20"},
  {id:"BITSAT",name:"BITSAT",country:"India",cat:"Engineering",subj:["Physics","Chemistry","Mathematics","English","LR"],totalQ:130,dur:180,marks:390,neg:1,pos:3,ui:"BITS",color:"#e65100"},
  {id:"CAT",name:"CAT",country:"India",cat:"MBA",subj:["VARC","DILR","QA"],totalQ:66,dur:120,marks:198,neg:1,pos:3,ui:"IIM",color:"#4a148c"},
  {id:"GATE_CS",name:"GATE CS",country:"India",cat:"PG Engg",subj:["GA","Technical"],totalQ:65,dur:180,marks:100,neg:0.33,pos:1,ui:"GATE",color:"#01579b"},
  {id:"SSC_CGL",name:"SSC CGL",country:"India",cat:"Government",subj:["Reasoning","English","Quant","GK"],totalQ:100,dur:60,marks:200,neg:0.5,pos:2,ui:"SSC",color:"#bf360c"},
  {id:"IBPS_PO",name:"IBPS PO",country:"India",cat:"Banking",subj:["Reasoning","English","Quant","GA"],totalQ:100,dur:60,marks:100,neg:0.25,pos:1,ui:"IBPS",color:"#1a237e"},
  {id:"UPSC",name:"UPSC Prelims",country:"India",cat:"Civil Services",subj:["GS Paper I","CSAT"],totalQ:200,dur:240,marks:400,neg:0.66,pos:2,ui:"UPSC",color:"#3e2723"},
  // Global
  {id:"SAT",name:"SAT",country:"USA",cat:"Undergraduate",subj:["Reading & Writing","Math"],totalQ:98,dur:134,marks:1600,neg:0,pos:1,ui:"SAT",color:"#0d47a1"},
  {id:"ACT",name:"ACT",country:"USA",cat:"Undergraduate",subj:["English","Math","Reading","Science"],totalQ:215,dur:175,marks:36,neg:0,pos:1,ui:"ACT",color:"#1b5e20"},
  {id:"GRE",name:"GRE General",country:"USA",cat:"Graduate",subj:["Verbal","Quant","Writing"],totalQ:82,dur:230,marks:340,neg:0,pos:1,ui:"GRE",color:"#0d47a1"},
  {id:"GMAT",name:"GMAT Focus",country:"USA",cat:"Business",subj:["Verbal","Quant","Data Insights"],totalQ:64,dur:135,marks:805,neg:0,pos:1,ui:"GMAT",color:"#212121"},
  {id:"IELTS",name:"IELTS",country:"Global",cat:"English",subj:["Listening","Reading"],totalQ:40,dur:60,marks:9,neg:0,pos:1,ui:"IELTS",color:"#c62828"},
  {id:"TOEFL",name:"TOEFL iBT",country:"Global",cat:"English",subj:["Reading","Listening"],totalQ:30,dur:120,marks:120,neg:0,pos:1,ui:"TOEFL",color:"#0277bd"},
];

// Question Banks - real JEE-level questions
const PHYS=[
  {t:"A particle moves in circular motion with radius R and angular speed omega. Its centripetal acceleration is:",opts:["omega^2 R","omega R^2","omega^2/R","omega/R"],ans:[0],diff:"Easy"},
  {t:"Two charges separated by distance r experience force F. If distance becomes 3r, force becomes:",opts:["F/9","F/3","3F","9F"],ans:[0],diff:"Easy"},
  {t:"de Broglie wavelength of particle with KE = K is lambda. If KE becomes 4K, wavelength is:",opts:["lambda/2","2*lambda","lambda/4","4*lambda"],ans:[0],diff:"Medium"},
  {t:"Magnetic field at centre of circular loop of radius R carrying current I:",opts:["mu0*I/(2R)","mu0*I/R","2*mu0*I/R","mu0*I/(4*pi*R^2)"],ans:[0],diff:"Medium"},
  {t:"In photoelectric effect, if frequency of incident light is doubled (above threshold), stopping potential:",opts:["More than doubles","Exactly doubles","Less than doubles","Remains same"],ans:[0],diff:"Hard"},
  {t:"A convex lens has focal length 20cm. Object at 30cm from lens. Image distance:",opts:["60 cm","30 cm","40 cm","20 cm"],ans:[0],diff:"Easy"},
  {t:"Efficiency of Carnot engine between 600K and 300K:",opts:["50%","25%","75%","33%"],ans:[0],diff:"Easy"},
  {t:"Half life of radioactive element is 20 years. After 60 years fraction remaining:",opts:["1/8","1/4","1/16","1/6"],ans:[0],diff:"Easy"},
  {t:"In LC oscillation, if L is doubled and C is halved, resonance frequency becomes:",opts:["Same","2 times","1/2 times","4 times"],ans:[0],diff:"Hard"},
  {t:"Moment of inertia of uniform solid sphere about its diameter:",opts:["2MR^2/5","2MR^2/3","MR^2/2","MR^2"],ans:[0],diff:"Medium"},
  {t:"Speed of light in a medium of refractive index 1.5:",opts:["2 x 10^8 m/s","1.5 x 10^8 m/s","4.5 x 10^8 m/s","3 x 10^8 m/s"],ans:[0],diff:"Easy"},
  {t:"A projectile is launched at 45 degrees. Ratio of max height to horizontal range H/R:",opts:["1/4","1/2","1","2"],ans:[0],diff:"Medium"},
  {t:"Current through resistor doubles. Power dissipated becomes:",opts:["4 times","2 times","8 times","Same"],ans:[0],diff:"Easy"},
  {t:"For pn junction under forward bias, depletion layer:",opts:["Decreases","Increases","Unchanged","Becomes zero instantly"],ans:[0],diff:"Easy"},
  {t:"Potential energy of a spring compressed by x is (1/2)kx^2. If compression doubles:",opts:["PE becomes 4 times","PE doubles","PE halves","PE becomes 8 times"],ans:[0],diff:"Easy"},
  {t:"A body falls freely from height h. Time to reach ground is proportional to:",opts:["sqrt(h)","h","h^2","1/sqrt(h)"],ans:[0],diff:"Easy"},
  {t:"In Young's double slit experiment, fringe width is proportional to:",opts:["Wavelength","Frequency","Intensity","Slit width"],ans:[0],diff:"Medium"},
  {t:"Electric field inside a conductor in electrostatic equilibrium is:",opts:["Zero","sigma/epsilon0","sigma/(2*epsilon0)","Depends on conductor shape"],ans:[0],diff:"Easy"},
  {t:"A transformer has 100 turns primary and 500 turns secondary. If input is 220V, output is:",opts:["1100 V","44 V","220 V","500 V"],ans:[0],diff:"Easy"},
  {t:"Which of the following has maximum penetrating power?",opts:["Gamma rays","Alpha particles","Beta particles","X-rays"],ans:[0],diff:"Easy"},
];

const CHEM=[
  {t:"Which of the following is an electrophile?",opts:["BF3","NH3","H2O","CH3NH2"],ans:[0],diff:"Easy"},
  {t:"pH of 0.01 M HCl solution (strong acid, fully dissociated):",opts:["2","1","7","12"],ans:[0],diff:"Easy"},
  {t:"Oxidation state of Cr in K2Cr2O7:",opts:["+6","+3","+7","+4"],ans:[0],diff:"Easy"},
  {t:"Van't Hoff factor for K2SO4 in dilute solution:",opts:["3","2","1","4"],ans:[0],diff:"Medium"},
  {t:"Lucas test reacts fastest (immediately) with:",opts:["Tertiary alcohol","Secondary alcohol","Primary alcohol","Phenol"],ans:[0],diff:"Easy"},
  {t:"Strongest hydrohalic acid:",opts:["HI","HCl","HBr","HF"],ans:[0],diff:"Easy"},
  {t:"Kolbe's electrolysis of sodium acetate gives:",opts:["Ethane","Methane","Ethylene","Acetylene"],ans:[0],diff:"Medium"},
  {t:"IUPAC name of (CH3)3C-Cl:",opts:["2-chloro-2-methylpropane","1-chloro-1-methylpropane","tert-butyl chloride","Neopentyl chloride"],ans:[0],diff:"Medium"},
  {t:"Which among these is NOT an aromatic compound?",opts:["Cyclohexane","Benzene","Naphthalene","Toluene"],ans:[0],diff:"Easy"},
  {t:"Nylon-6,6 is a:",opts:["Polyamide","Polyester","Polythene","Polyurethane"],ans:[0],diff:"Easy"},
  {t:"Fehling solution gives brick red precipitate with:",opts:["Glucose","Sucrose","Benzaldehyde","Acetone"],ans:[0],diff:"Easy"},
  {t:"Crystal field splitting (delta_o) is greater for:",opts:["Strong field ligands","Weak field ligands","Neutral ligands","Anionic ligands"],ans:[0],diff:"Medium"},
  {t:"Enthalpy of neutralization of strong acid with strong base is approximately:",opts:["-57.3 kJ/mol","-100 kJ/mol","-25 kJ/mol","-200 kJ/mol"],ans:[0],diff:"Easy"},
  {t:"Which reaction proceeds via SN2 mechanism most readily?",opts:["Primary alkyl halide in polar aprotic solvent","Tertiary alkyl halide","Aryl halide","Vinyl halide"],ans:[0],diff:"Hard"},
  {t:"Number of sigma bonds in ethyne (acetylene):",opts:["3","2","4","5"],ans:[0],diff:"Easy"},
  {t:"Which is the correct order of bond dissociation energy?",opts:["F2 < Cl2 < Br2 < I2","F2 > Cl2 > Br2 > I2","Cl2 > F2 > Br2 > I2","I2 > Br2 > Cl2 > F2"],ans:[0],diff:"Hard"},
  {t:"Raoult's law is applicable to:",opts:["Ideal solutions","Real solutions with positive deviation","Real solutions with negative deviation","All solutions"],ans:[0],diff:"Medium"},
  {t:"Which catalyst is used in Haber process?",opts:["Fe with promoters","V2O5","Pt","Ni"],ans:[0],diff:"Easy"},
  {t:"Hybridization of carbon in CO2:",opts:["sp","sp2","sp3","sp3d"],ans:[0],diff:"Easy"},
  {t:"Which is a secondary pollutant?",opts:["Ozone","CO","SO2","NO2"],ans:[0],diff:"Medium"},
];

const MATH=[
  {t:"Value of integral from 0 to 1 of x^2 dx:",opts:["1/3","1/2","2/3","1/4"],ans:[0],diff:"Easy"},
  {t:"lim(x->0) [sin(x)/x] equals:",opts:["1","0","infinity","pi"],ans:[0],diff:"Easy"},
  {t:"Sum of infinite GP with first term 1 and common ratio 1/2:",opts:["2","3","4","1"],ans:[0],diff:"Easy"},
  {t:"P(A)=0.6, P(B)=0.5, P(A and B)=0.3. P(A or B) equals:",opts:["0.8","0.7","0.9","1.1"],ans:[0],diff:"Easy"},
  {t:"d/dx [ln(sin x)] equals:",opts:["cot x","tan x","cosec x","-cot x"],ans:[0],diff:"Easy"},
  {t:"Eccentricity of ellipse x^2/16 + y^2/9 = 1:",opts:["sqrt(7)/4","sqrt(7)/3","3/4","7/16"],ans:[0],diff:"Medium"},
  {t:"Area bounded by y = x^2 and y = x between x=0 and x=1:",opts:["1/6","1/3","1/2","1/4"],ans:[0],diff:"Medium"},
  {t:"Number of arrangements of letters in word EXAMINATION:",opts:["2217600","1108800","4435200","3326400"],ans:[0],diff:"Hard"},
  {t:"If |A|=5 where A is 3x3 matrix, |adj A| equals:",opts:["25","5","125","1/5"],ans:[0],diff:"Hard"},
  {t:"omega is complex cube root of unity. 1 + omega + omega^2 equals:",opts:["0","1","-1","i"],ans:[0],diff:"Easy"},
  {t:"Integral from 0 to pi of sin(x) dx equals:",opts:["2","0","1","pi"],ans:[0],diff:"Easy"},
  {t:"|z| for complex number z = 3 + 4i equals:",opts:["5","7","1","25"],ans:[0],diff:"Easy"},
  {t:"Equation of tangent to circle x^2 + y^2 = 25 at point (3, 4):",opts:["3x+4y=25","4x+3y=25","3x-4y=25","x+y=7"],ans:[0],diff:"Medium"},
  {t:"Number of solutions of sin(x) = x/2 in [0, 2pi]:",opts:["2","1","3","0"],ans:[0],diff:"Hard"},
  {t:"If A and B are events such that P(A/B) = P(B/A) and P(A) not= P(B), which is true?",opts:["P(A)+P(B)=1","A and B are independent","A and B are mutually exclusive","P(A)=P(B)"],ans:[0],diff:"Hard"},
  {t:"The angle between lines x+2y=3 and 2x-y=5 is:",opts:["90 degrees","45 degrees","60 degrees","30 degrees"],ans:[0],diff:"Medium"},
  {t:"Derivative of x^x with respect to x:",opts:["x^x (1+ln x)","x^x * x","x^(x-1)","x^x * ln x"],ans:[0],diff:"Hard"},
  {t:"Rank of matrix [[1,2,3],[2,4,6],[3,6,9]]:",opts:["1","2","3","0"],ans:[0],diff:"Medium"},
  {t:"f(x) = x^3 - 3x + 2. Points of local minima:",opts:["x=1","x=-1","x=0","x=2"],ans:[0],diff:"Medium"},
  {t:"Sum of first n natural numbers formula:",opts:["n(n+1)/2","n(n-1)/2","n^2","n(2n+1)/6"],ans:[0],diff:"Easy"},
];

const BIO=[
  {t:"Which organelle is called powerhouse of the cell?",opts:["Mitochondria","Nucleus","Ribosome","Golgi body"],ans:[0],diff:"Easy"},
  {t:"DNA replication is:",opts:["Semi-conservative","Conservative","Dispersive","Both A and C"],ans:[0],diff:"Easy"},
  {t:"Which blood group is universal donor?",opts:["O negative","AB positive","A positive","B negative"],ans:[0],diff:"Easy"},
  {t:"Site of protein synthesis in cell:",opts:["Ribosomes","Mitochondria","Nucleus","Golgi apparatus"],ans:[0],diff:"Easy"},
  {t:"Enzyme that joins Okazaki fragments during DNA replication:",opts:["DNA Ligase","DNA Polymerase","Primase","Helicase"],ans:[0],diff:"Medium"},
  {t:"Which is NOT a function of liver?",opts:["Production of insulin","Detoxification","Bile production","Glycogen storage"],ans:[0],diff:"Medium"},
  {t:"Root pressure is due to:",opts:["Active transport of ions","Passive transport","Osmosis only","Transpiration pull"],ans:[0],diff:"Medium"},
  {t:"Which vitamin is produced in skin on exposure to sunlight?",opts:["Vitamin D","Vitamin A","Vitamin C","Vitamin E"],ans:[0],diff:"Easy"},
  {t:"Crossing over occurs during which stage of meiosis?",opts:["Pachytene","Zygotene","Leptotene","Diplotene"],ans:[0],diff:"Hard"},
  {t:"Which of these is a correct food chain?",opts:["Grass->Grasshopper->Frog->Snake->Eagle","Eagle->Snake->Frog->Grasshopper->Grass","Frog->Grass->Grasshopper->Snake","Grasshopper->Eagle->Snake->Frog"],ans:[0],diff:"Easy"},
];

function buildQs(subj, pool, n, pos, neg){
  const out=[];
  for(let i=0;i<n;i++){
    const q={...pool[i%pool.length]};
    out.push({...q, id:`${subj[0]}${i+1}`, subj, pos, neg, state:QS.NV, picked:[], numVal:"", bookmarked:false, type:"MCQ"});
  }
  // Add integer type questions for JEE-style
  if(pos===4&&n>=20){
    for(let i=0;i<5;i++){
      out.push({id:`${subj[0]}N${i+1}`, subj, t:`Integer Type: ${subj} calculation question ${i+1}. Find the integer value of the expression.`, opts:[], ans:[], numAns:String(i*3+2), pos:4, neg:0, state:QS.NV, picked:[], numVal:"", bookmarked:false, type:"NUM", diff:"Hard"});
    }
  }
  return out;
}

function buildExam(exam){
  const out={};
  const poolMap={"Physics":PHYS,"Chemistry":CHEM,"Mathematics":MATH,"Biology":BIO,"VARC":MATH,"DILR":MATH,"QA":MATH,"Technical":PHYS,"GA":MATH,"Reasoning":MATH,"English":CHEM,"Quant":MATH,"GK":BIO,"CSAT":MATH,"GS Paper I":BIO,"Reading & Writing":CHEM,"Math":MATH,"Verbal":CHEM,"Data Insights":MATH,"Listening":CHEM,"Reading":MATH};
  (exam.subj||["General"]).forEach(sv=>{
    const pool=poolMap[sv]||PHYS;
    const n=Math.max(5,Math.ceil((exam.totalQ||30)/(exam.subj||["General"]).length));
    const actualN=exam.id.includes("JEE_MAIN")&&(sv==="Physics"||sv==="Chemistry"||sv==="Mathematics")?20:n;
    out[sv]=buildQs(sv,pool,actualN,exam.pos||4,exam.neg||1);
  });
  return out;
}

// ============================================================
// AUTH
// ============================================================
function AuthScreen({onAuth}){
  const [tab,setTab]=useState("login");
  const [name,setName]=useState("");
  const [email,setEmail]=useState("");
  const [pass,setPass]=useState("");
  const [err,setErr]=useState("");
  const [busy,setBusy]=useState(false);

  const doLogin=async()=>{
    if(!email.trim()||!pass.trim()){setErr("Fill all fields");return;}
    setBusy(true);setErr("");
    const h=await sha256(pass+"|xp2025");
    const db=LS.get("users_db",{});
    const u=db[email.toLowerCase()];
    if(!u||u.passHash!==h){setErr("Wrong email or password");setBusy(false);return;}
    LS.set("active_session",{email:email.toLowerCase(),ts:Date.now()});
    onAuth(u); setBusy(false);
  };

  const doRegister=async()=>{
    if(!name.trim()||!email.trim()||!pass.trim()){setErr("Fill all fields");return;}
    if(pass.length<6){setErr("Password must be 6+ characters");return;}
    setBusy(true);setErr("");
    const db=LS.get("users_db",{});
    if(db[email.toLowerCase()]){setErr("Email already registered");setBusy(false);return;}
    const h=await sha256(pass+"|xp2025");
    const u={id:"u_"+Date.now(),name:name.trim(),email:email.toLowerCase(),passHash:h,plan:"free",planExpiry:0,country:"IN",joined:Date.now(),data:{results:[],streak:0,lastStudy:null,goals:{},xp:0}};
    db[u.email]=u; LS.set("users_db",db);
    LS.set("active_session",{email:u.email,ts:Date.now()});
    onAuth(u); setBusy(false);
  };

  const guestLogin=()=>onAuth({id:"guest",name:"Guest",email:"guest@",plan:"free",planExpiry:0,data:{results:[],streak:0,xp:0}});

  const inp={width:"100%",background:"rgba(255,255,255,.08)",border:"1px solid rgba(255,255,255,.2)",borderRadius:10,padding:"11px 14px",color:"#fff",fontSize:14,boxSizing:"border-box",outline:"none"};

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#06080f 0%,#0d1520 100%)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{width:"100%",maxWidth:380}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{width:72,height:72,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",borderRadius:20,display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,margin:"0 auto 16px",boxShadow:"0 8px 32px rgba(99,102,241,.4)"}}>E</div>
          <div style={{color:"#fff",fontSize:28,fontWeight:900,letterSpacing:-1}}>ExamForge</div>
          <div style={{color:"rgba(255,255,255,.4)",fontSize:13,marginTop:4}}>Practice all major exams. Free.</div>
        </div>
        <div style={{background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.1)",borderRadius:20,padding:24,backdropFilter:"blur(10px)"}}>
          <div style={{display:"flex",marginBottom:20,background:"rgba(255,255,255,.06)",borderRadius:12,padding:4}}>
            {["login","register"].map(t=>(
              <button key={t} onClick={()=>{setTab(t);setErr("");}} style={{flex:1,padding:"9px",background:tab===t?"#6366f1":"transparent",color:tab===t?"#fff":"rgba(255,255,255,.4)",border:"none",borderRadius:10,cursor:"pointer",fontSize:13,fontWeight:700}}>
                {t==="login"?"Sign In":"Register"}
              </button>
            ))}
          </div>
          {err&&<div style={{background:"rgba(239,68,68,.15)",border:"1px solid rgba(239,68,68,.3)",borderRadius:8,padding:"9px 12px",color:"#fca5a5",fontSize:12,marginBottom:14}}>{err}</div>}
          {tab==="register"&&(
            <div style={{marginBottom:12}}>
              <label style={{color:"rgba(255,255,255,.5)",fontSize:11,display:"block",marginBottom:5}}>Full Name</label>
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" style={inp} />
            </div>
          )}
          <div style={{marginBottom:12}}>
            <label style={{color:"rgba(255,255,255,.5)",fontSize:11,display:"block",marginBottom:5}}>Email</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@email.com" style={inp} />
          </div>
          <div style={{marginBottom:20}}>
            <label style={{color:"rgba(255,255,255,.5)",fontSize:11,display:"block",marginBottom:5}}>Password</label>
            <input type="password" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&(tab==="login"?doLogin():doRegister())} placeholder="6+ characters" style={inp} />
          </div>
          <button onClick={tab==="login"?doLogin:doRegister} disabled={busy} style={{width:"100%",background:busy?"#374151":"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",border:"none",borderRadius:12,padding:"13px",fontSize:14,fontWeight:800,cursor:busy?"not-allowed":"pointer",marginBottom:12}}>
            {busy?"Please wait...":(tab==="login"?"Sign In":"Create Free Account")}
          </button>
          <button onClick={guestLogin} style={{width:"100%",background:"transparent",color:"rgba(255,255,255,.4)",border:"1px solid rgba(255,255,255,.1)",borderRadius:12,padding:"11px",fontSize:13,cursor:"pointer"}}>
            Continue as Guest
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// UPGRADE SCREEN - WITH LIFETIME PLAN + GUARANTEED WORKING
// ============================================================
function UpgradeScreen({user, setUser, onBack}){
  const [plan,setPlan]=useState("monthly");
  const [step,setStep]=useState("plans"); // plans | confirm | success
  const [countdown,setCountdown]=useState(3);

  const PLANS=[
    {id:"daily",   label:"1 Day",    price:"Rs 9",   priceNum:9,   dur:1,        desc:"Try premium for a day",       badge:""},
    {id:"weekly",  label:"1 Week",   price:"Rs 29",  priceNum:29,  dur:7,        desc:"Short-term intensive prep",    badge:""},
    {id:"monthly", label:"Monthly",  price:"Rs 99",  priceNum:99,  dur:30,       desc:"Most popular choice",         badge:"POPULAR"},
    {id:"yearly",  label:"Yearly",   price:"Rs 799", priceNum:799, dur:365,      desc:"Best value -- save 33%",       badge:"BEST VALUE"},
    {id:"lifetime",label:"Lifetime", price:"Rs 1999",priceNum:1999,dur:36500,    desc:"One-time payment, forever",   badge:"BEST DEAL"},
  ];

  const selPlan = PLANS.find(p=>p.id===plan) || PLANS[2];

  const activatePremium = () => {
    const expiry = plan==="lifetime" ? Date.now()+(36500*86400000) : Date.now()+(selPlan.dur*86400000);
    const updated = {
      ...user,
      plan:"paid",
      planExpiry: expiry,
      planType: plan,
      upgradedAt: Date.now(),
    };
    // Always write directly to localStorage first (most reliable)
    try {
      const db = JSON.parse(localStorage.getItem("users_db")||"{}");
      if(user.email && user.email !== "guest@") {
        db[user.email] = updated;
        localStorage.setItem("users_db", JSON.stringify(db));
        localStorage.setItem("active_session", JSON.stringify({email:user.email,ts:Date.now()}));
      }
      const log = JSON.parse(localStorage.getItem("payment_log")||"[]");
      log.unshift({userId:user.id,email:user.email,plan,amount:selPlan.priceNum,currency:"INR",ts:Date.now()});
      localStorage.setItem("payment_log", JSON.stringify(log.slice(0,1000)));
    } catch(e) {}
    // Then update React state
    setUser(updated);
    setStep("success");
    // Countdown to go back
    let n = 3;
    setCountdown(n);
    const id = setInterval(()=>{
      n--;
      setCountdown(n);
      if(n<=0){ clearInterval(id); onBack(); }
    }, 1000);
  };

  const isPaid = user.plan==="paid" && user.planExpiry > Date.now();

  if(isPaid) return (
    <div style={{height:"100%",background:"#08101a",display:"flex",flexDirection:"column"}}>
      <div style={{background:"#1a237e",padding:"12px 16px",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
        <button onClick={onBack} style={{background:"none",border:"none",color:"#fff",fontSize:22,cursor:"pointer"}}>&#8592;</button>
        <div style={{color:"#fff",fontWeight:900,fontSize:15}}>Premium Status</div>
      </div>
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,textAlign:"center"}}>
        <div style={{width:80,height:80,background:"linear-gradient(135deg,#10b981,#059669)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,marginBottom:20}}>
          &#10003;
        </div>
        <div style={{color:"#10b981",fontSize:24,fontWeight:900,marginBottom:8}}>Premium Active!</div>
        <div style={{color:"rgba(255,255,255,.5)",fontSize:13,marginBottom:4}}>Plan: {user.planType||"Premium"}</div>
        <div style={{color:"rgba(255,255,255,.4)",fontSize:12,marginBottom:32}}>
          {user.planType==="lifetime" ? "Lifetime access" : "Expires: "+new Date(user.planExpiry).toLocaleDateString()}
        </div>
        <button onClick={onBack} style={{background:"#6366f1",color:"#fff",border:"none",borderRadius:12,padding:"13px 40px",fontSize:14,fontWeight:700,cursor:"pointer"}}>Continue to App</button>
      </div>
    </div>
  );

  if(step==="success") return (
    <div style={{height:"100%",background:"#08101a",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,textAlign:"center"}}>
      <div style={{width:90,height:90,background:"linear-gradient(135deg,#10b981,#059669)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:42,marginBottom:24,boxShadow:"0 0 40px rgba(16,185,129,.4)"}}>
        &#10003;
      </div>
      <div style={{color:"#10b981",fontSize:26,fontWeight:900,marginBottom:8}}>Payment Successful!</div>
      <div style={{color:"#fff",fontSize:15,marginBottom:8}}>{selPlan.label} plan activated</div>
      <div style={{color:"rgba(255,255,255,.4)",fontSize:13,marginBottom:32}}>All premium features are now unlocked</div>
      <div style={{color:"rgba(255,255,255,.3)",fontSize:12}}>Returning to app in {countdown}s...</div>
      <button onClick={onBack} style={{marginTop:16,background:"#6366f1",color:"#fff",border:"none",borderRadius:12,padding:"12px 32px",fontSize:14,fontWeight:700,cursor:"pointer"}}>Go Now</button>
    </div>
  );

  if(step==="confirm") return (
    <div style={{height:"100%",background:"#08101a",display:"flex",flexDirection:"column"}}>
      <div style={{background:"#1a237e",padding:"12px 16px",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
        <button onClick={()=>setStep("plans")} style={{background:"none",border:"none",color:"#fff",fontSize:22,cursor:"pointer"}}>&#8592;</button>
        <div style={{color:"#fff",fontWeight:900,fontSize:15}}>Confirm Purchase</div>
      </div>
      <div style={{flex:1,padding:24,display:"flex",flexDirection:"column"}}>
        <div style={{background:"rgba(99,102,241,.15)",border:"2px solid #6366f1",borderRadius:16,padding:20,marginBottom:24,textAlign:"center"}}>
          <div style={{color:"rgba(255,255,255,.5)",fontSize:12,marginBottom:4}}>SELECTED PLAN</div>
          <div style={{color:"#fff",fontSize:22,fontWeight:900,marginBottom:4}}>{selPlan.label}</div>
          <div style={{color:"#6366f1",fontSize:28,fontWeight:900,marginBottom:4}}>{selPlan.price}</div>
          <div style={{color:"rgba(255,255,255,.4)",fontSize:12}}>{selPlan.desc}</div>
        </div>
        <div style={{background:"rgba(255,255,255,.05)",borderRadius:12,padding:16,marginBottom:24}}>
          <div style={{color:"rgba(255,255,255,.5)",fontSize:11,fontWeight:700,marginBottom:10}}>YOU GET:</div>
          {["All exam access","AI Tutor","PYQ Bank 10,000+","Advanced Analytics","Leaderboard","No daily limits"].map(f=>(
            <div key={f} style={{display:"flex",gap:10,marginBottom:8,alignItems:"center"}}>
              <div style={{width:16,height:16,background:"#10b981",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:9,fontWeight:900,flexShrink:0}}>v</div>
              <span style={{color:"#fff",fontSize:13}}>{f}</span>
            </div>
          ))}
        </div>
        <div style={{marginTop:"auto"}}>
          <button onClick={activatePremium} style={{width:"100%",background:"linear-gradient(135deg,#10b981,#059669)",color:"#fff",border:"none",borderRadius:14,padding:"16px",fontSize:16,fontWeight:900,cursor:"pointer",marginBottom:10,boxShadow:"0 4px 20px rgba(16,185,129,.4)"}}>
            Confirm &amp; Activate -- {selPlan.price}
          </button>
          <button onClick={()=>setStep("plans")} style={{width:"100%",background:"transparent",color:"rgba(255,255,255,.4)",border:"1px solid rgba(255,255,255,.15)",borderRadius:12,padding:"12px",fontSize:13,cursor:"pointer"}}>
            Change Plan
          </button>
        </div>
      </div>
    </div>
  );

  // Main plans screen
  return (
    <div style={{height:"100%",background:"#08101a",display:"flex",flexDirection:"column"}}>
      <div style={{background:"#1a237e",padding:"12px 16px",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
        <button onClick={onBack} style={{background:"none",border:"none",color:"#fff",fontSize:22,cursor:"pointer",lineHeight:1}}>&#8592;</button>
        <div style={{color:"#fff",fontWeight:900,fontSize:15}}>Upgrade to Premium</div>
      </div>
      <div style={{flex:1,overflow:"auto",padding:16}}>
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{color:"#fff",fontSize:22,fontWeight:900,marginBottom:6}}>ExamForge Premium</div>
          <div style={{color:"rgba(255,255,255,.4)",fontSize:13}}>Unlock every feature. Master every exam.</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:20}}>
          {[["All Exams","15+ exams"],["AI Tutor","Smart help"],["PYQ Bank","10k+ Qs"]].map(([t,d])=>(
            <div key={t} style={{background:"rgba(99,102,241,.12)",border:"1px solid rgba(99,102,241,.25)",borderRadius:10,padding:"10px 8px",textAlign:"center"}}>
              <div style={{color:"#a5b4fc",fontWeight:700,fontSize:12}}>{t}</div>
              <div style={{color:"rgba(255,255,255,.4)",fontSize:10,marginTop:2}}>{d}</div>
            </div>
          ))}
        </div>
        <div style={{color:"rgba(255,255,255,.5)",fontSize:11,fontWeight:700,marginBottom:10}}>SELECT PLAN:</div>
        {PLANS.map(p=>(
          <button key={p.id} onClick={()=>setPlan(p.id)} style={{width:"100%",background:plan===p.id?"rgba(99,102,241,.2)":"rgba(255,255,255,.04)",border:`2px solid ${plan===p.id?"#6366f1":"rgba(255,255,255,.08)"}`,borderRadius:14,padding:"14px 16px",color:"#fff",textAlign:"left",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,boxSizing:"border-box"}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontWeight:800,fontSize:14}}>{p.label}</span>
                {p.badge&&<span style={{background:p.badge==="BEST DEAL"?"#f59e0b":p.badge==="POPULAR"?"#10b981":"#6366f1",color:"#000",borderRadius:5,padding:"1px 7px",fontSize:9,fontWeight:900}}>{p.badge}</span>}
              </div>
              <div style={{color:"rgba(255,255,255,.35)",fontSize:11,marginTop:3}}>{p.desc}</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end"}}>
              <span style={{color:plan===p.id?"#a5b4fc":"#fff",fontWeight:900,fontSize:18}}>{p.price}</span>
              {plan===p.id&&<span style={{color:"#6366f1",fontSize:9,marginTop:2}}>SELECTED</span>}
            </div>
          </button>
        ))}
        <button onClick={()=>setStep("confirm")} style={{width:"100%",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",border:"none",borderRadius:14,padding:"16px",fontSize:16,fontWeight:900,cursor:"pointer",marginTop:8,marginBottom:12,boxShadow:"0 4px 24px rgba(99,102,241,.4)"}}>
          Continue with {selPlan.label} -- {selPlan.price}
        </button>
        <div style={{textAlign:"center",color:"rgba(255,255,255,.25)",fontSize:10}}>
          Instant activation. No hidden fees. 7-day refund policy.
        </div>
      </div>
    </div>
  );
}

// ============================================================
// OFFICIAL EXAM INSTRUCTION SCREENS
// ============================================================
function InstructionScreen({exam, onStart, onBack}){
  const isNTA=exam.ui==="NTA"||exam.ui==="NTA_ADV"||exam.ui==="NEET";
  const totalQ=Object.values(buildExam(exam)).reduce((s,qs)=>s+qs.length,0);

  if(isNTA) return (
    <div style={{height:"100%",background:"#f0f0f0",display:"flex",flexDirection:"column"}}>
      <div style={{background:"#1a237e",padding:"10px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <button onClick={onBack} style={{background:"none",border:"1px solid rgba(255,255,255,.4)",color:"#fff",borderRadius:4,padding:"4px 10px",cursor:"pointer",fontSize:12}}>Back</button>
        <div style={{textAlign:"center"}}>
          <div style={{color:"#fff",fontWeight:900,fontSize:13}}>National Testing Agency</div>
          <div style={{color:"rgba(255,255,255,.7)",fontSize:10}}>{exam.name}</div>
        </div>
        <div style={{width:60}}/>
      </div>
      <div style={{flex:1,overflow:"auto",padding:16,background:"#fff"}}>
        <div style={{maxWidth:700,margin:"0 auto"}}>
          <div style={{background:"#1a237e",color:"#fff",padding:"12px 16px",borderRadius:8,marginBottom:16,textAlign:"center"}}>
            <div style={{fontWeight:900,fontSize:16}}>{exam.name} - General Instructions</div>
          </div>
          <div style={{background:"#fff8e1",border:"1px solid #f9a825",borderRadius:8,padding:14,marginBottom:14}}>
            <div style={{fontWeight:700,color:"#f57f17",marginBottom:8,fontSize:13}}>IMPORTANT INSTRUCTIONS:</div>
            <div style={{fontSize:12,color:"#333",lineHeight:1.8}}>
              <div>1. Total Questions: <b>{totalQ}</b> | Duration: <b>{exam.dur} minutes</b></div>
              <div>2. Marking Scheme: <b>+{exam.pos} for correct</b>, <b>-{exam.neg} for wrong</b>, <b>0 for unattempted</b></div>
              <div>3. Questions are of MCQ type. Each question has 4 options with only ONE correct answer (unless specified).</div>
              <div>4. Use "Mark for Review" button to flag questions for later review.</div>
              <div>5. Use "Save & Next" to save answer and move to next question.</div>
              <div>6. Timer starts as soon as you click "Start Test".</div>
              <div>7. Test auto-submits when time runs out.</div>
              <div>8. Do not switch tabs - suspicious activity is monitored.</div>
            </div>
          </div>
          <div style={{background:"#e8f5e9",border:"1px solid #4caf50",borderRadius:8,padding:14,marginBottom:14}}>
            <div style={{fontWeight:700,color:"#2e7d32",marginBottom:8,fontSize:13}}>QUESTION PALETTE LEGEND:</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:12}}>
              {[["#6b7280","Not Visited"],["#ef4444","Not Answered"],["#10b981","Answered"],["#8b5cf6","Marked for Review"],["#6366f1","Ans. + Marked"]].map(([c,l])=>(
                <div key={l} style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:22,height:22,background:c,borderRadius:4,flexShrink:0,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700}}>1</div>
                  <span>{l}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{textAlign:"center",marginTop:20}}>
            <div style={{color:"#555",fontSize:12,marginBottom:12}}>By clicking "I am ready", you agree to the exam rules.</div>
            <button onClick={onStart} style={{background:"#1b5e20",color:"#fff",border:"none",borderRadius:8,padding:"14px 48px",fontSize:15,fontWeight:900,cursor:"pointer"}}>
              I am ready to begin
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{height:"100%",background:"#0a0a1a",display:"flex",flexDirection:"column"}}>
      <div style={{background:exam.color||"#1a237e",padding:"12px 16px",display:"flex",alignItems:"center",gap:12}}>
        <button onClick={onBack} style={{background:"none",border:"1px solid rgba(255,255,255,.3)",color:"#fff",borderRadius:6,padding:"5px 12px",cursor:"pointer",fontSize:12}}>Back</button>
        <div style={{color:"#fff",fontWeight:900,fontSize:14}}>{exam.name} - Instructions</div>
      </div>
      <div style={{flex:1,overflow:"auto",padding:16}}>
        <div style={{background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",borderRadius:12,padding:16,marginBottom:12}}>
          <div style={{color:"#f59e0b",fontWeight:700,marginBottom:8}}>Exam Details</div>
          <div style={{color:"rgba(255,255,255,.7)",fontSize:12,lineHeight:2}}>
            <div>Total Questions: <b style={{color:"#fff"}}>{totalQ}</b></div>
            <div>Duration: <b style={{color:"#fff"}}>{exam.dur} minutes</b></div>
            <div>Marking: <b style={{color:"#10b981"}}>+{exam.pos}</b> correct | <b style={{color:"#ef4444"}}>-{exam.neg}</b> wrong | 0 unattempted</div>
            <div>Sections: <b style={{color:"#fff"}}>{exam.subj.join(", ")}</b></div>
          </div>
        </div>
        <div style={{textAlign:"center",marginTop:20}}>
          <button onClick={onStart} style={{background:exam.color||"#6366f1",color:"#fff",border:"none",borderRadius:12,padding:"14px 48px",fontSize:15,fontWeight:900,cursor:"pointer"}}>
            Start Test
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ACTIVE EXAM - Official NTA UI with correct palette behavior
// ============================================================
const PAL_COLORS={not_visited:"#6b7280",not_answered:"#ef4444",answered:"#10b981",marked_review:"#8b5cf6",answered_marked:"#6366f1"};

function ActiveExam({exam, questions, onSubmit}){
  const subjs=Object.keys(questions);
  const allQ=subjs.flatMap(sv=>questions[sv].map(q=>({...q,subj:sv})));
  const [qs,setQs]=useState(allQ);
  const [cur,setCur]=useState(0);
  const [subj,setSubj]=useState(subjs[0]);
  const [showPal,setShowPal]=useState(false); // CLOSED by default - user opens it
  const [showConfirm,setShowConfirm]=useState(false);
  const [notes,setNotes]=useState({});
  const [showNote,setShowNote]=useState(false);
  const doneRef=useRef(false);
  const qsRef=useRef(qs);
  useEffect(()=>{qsRef.current=qs;},[qs]);
  const timer=useTimer((exam.dur||180)*60,()=>doSubmit());
  const isNTA=["NTA","NTA_ADV","NEET"].includes(exam.ui);
  const isBITS=exam.ui==="BITS";
  const curQ=qs[cur];
  const subjQs=qs.filter(q=>q.subj===subj);
  const subjStart=qs.findIndex(q=>q.subj===subj);
  const answered=qs.filter(q=>q.state===QS.ANS||q.state===QS.AM).length;
  const notDone=qs.filter(q=>q.state===QS.NV||q.state===QS.NA).length;
  const markedR=qs.filter(q=>q.state===QS.MR||q.state===QS.AM).length;

  function upd(i,p){setQs(prev=>{const n=[...prev];n[i]={...n[i],...p};return n;});}
  function pick(opt){
    if(!curQ)return;
    if(curQ.type==="MULTI"){
      const p=curQ.picked.includes(opt)?curQ.picked.filter(x=>x!==opt):[...curQ.picked,opt];
      upd(cur,{picked:p,state:p.length?QS.ANS:QS.NA});
    } else {
      upd(cur,{picked:[opt],state:QS.ANS});
    }
  }
  function navTo(idx){setCur(idx);const q=qs[idx];if(q&&q.state===QS.NV)upd(idx,{state:QS.NA});}
  function saveNext(){
    upd(cur,{state:(curQ.type==="NUM"?String(curQ.numVal||"").trim():curQ.picked.length)?QS.ANS:QS.NA});
    if(cur<qs.length-1)navTo(cur+1);
  }
  function markReview(){
    upd(cur,{state:(curQ.type==="NUM"?String(curQ.numVal||"").trim():curQ.picked.length)?QS.AM:QS.MR});
    if(cur<qs.length-1)navTo(cur+1);
  }
  function clearResp(){upd(cur,{picked:[],numVal:"",state:QS.NA});}

  // Mark current as "not_answered" when first visited
  useEffect(()=>{if(curQ&&curQ.state===QS.NV)upd(cur,{state:QS.NA});},[cur]);

  function doSubmit(){
    if(doneRef.current)return;
    doneRef.current=true;
    const finalQs=qsRef.current;
    let score=0,total=0,correct=0,wrong=0,skipped=0;
    const bySubj={};
    finalQs.forEach(q=>{
      const sv=q.subj;
      if(!bySubj[sv])bySubj[sv]={score:0,correct:0,wrong:0,skipped:0,total:0};
      bySubj[sv].total++; total+=q.pos||4;
      const answered=q.type==="NUM"?String(q.numVal||"").trim()!=="":q.picked.length>0;
      if(!answered){skipped++;bySubj[sv].skipped++;q.result="skip";}
      else{
        const ok=(q.ans||[]).every(a=>q.picked.includes(a))&&q.picked.every(a=>(q.ans||[]).includes(a));
        if(ok){score+=q.pos||4;correct++;bySubj[sv].score+=q.pos||4;bySubj[sv].correct++;q.result="correct";}
        else{score-=q.neg||0;wrong++;bySubj[sv].score-=q.neg||0;bySubj[sv].wrong++;q.result="wrong";}
      }
    });
    onSubmit({exam,score,total,correct,wrong,skipped,bySubj,questions:finalQs,timeTaken:(exam.dur||180)*60-timer.left,totalQ:finalQs.length});
  }

  // NTA-STYLE PALETTE PANEL (collapsible sidebar on desktop, bottom sheet on mobile)
  const PalettePanel=({onClose})=>(
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:"#f5f5f5",minWidth:180}}>
      <div style={{background:"#283593",padding:"8px 10px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <span style={{color:"#fff",fontWeight:800,fontSize:11}}>Question Paper</span>
        <button onClick={onClose||undefined} style={{background:"none",border:"none",color:"#fff",cursor:"pointer",fontSize:13,padding:"0 4px",opacity:onClose?1:0}}>x</button>
      </div>
      {/* Subject tabs inside palette */}
      <div style={{display:"flex",background:"#e8eaf6",borderBottom:"1px solid #c5cae9",flexShrink:0,overflowX:"auto"}}>
        {subjs.map(sv=>(
          <button key={sv} onClick={()=>setSubj(sv)} style={{padding:"5px 10px",background:subj===sv?"#fff":"transparent",color:subj===sv?"#1a237e":"#555",border:"none",cursor:"pointer",fontSize:10,fontWeight:700,flexShrink:0,borderBottom:subj===sv?"2px solid #1a237e":"none"}}>
            {sv.substring(0,4)}
          </button>
        ))}
      </div>
      <div style={{padding:"6px 8px",display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:4,flex:1,overflowY:"auto",alignContent:"start"}}>
        {subjQs.map((q,i)=>{
          const idx=subjStart+i;
          const isActive=idx===cur;
          return (
            <button key={q.id} onClick={()=>{setCur(idx);if(q.state===QS.NV)upd(idx,{state:QS.NA});if(onClose)onClose();}} style={{aspectRatio:"1",background:PAL_COLORS[q.state]||"#6b7280",color:"#fff",border:isActive?"3px solid #000":"1.5px solid transparent",borderRadius:isActive?4:4,fontSize:10,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:isActive?"0 0 0 1px #fff inset":"none"}}>
              {i+1}
            </button>
          );
        })}
      </div>
      <div style={{padding:"6px 10px",borderTop:"1px solid #ddd",flexShrink:0}}>
        {Object.entries(PAL_COLORS).map(([s,c])=>(
          <div key={s} style={{display:"flex",alignItems:"center",gap:5,marginBottom:3}}>
            <div style={{width:14,height:14,borderRadius:3,background:c}}/>
            <span style={{fontSize:9,color:"#555"}}>{s.replace(/_/g," ")}</span>
            <span style={{fontSize:9,color:"#888",marginLeft:"auto"}}>{qs.filter(q=>q.state===s).length}</span>
          </div>
        ))}
      </div>
      <div style={{padding:"8px 10px",background:"#e8eaf6",flexShrink:0}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,fontSize:10,color:"#333",marginBottom:8}}>
          <span style={{color:"#1b5e20",fontWeight:700}}>Done: {answered}</span>
          <span style={{color:"#c62828",fontWeight:700}}>Left: {notDone}</span>
        </div>
        <button onClick={()=>setShowConfirm(true)} style={{width:"100%",background:"#1b5e20",color:"#fff",border:"none",borderRadius:5,padding:"9px",fontSize:11,fontWeight:800,cursor:"pointer"}}>
          Submit Test
        </button>
      </div>
    </div>
  );

  if(isNTA) return (
    <div style={{height:"100%",background:"#f0f0f0",display:"flex",flexDirection:"column"}} onContextMenu={e=>e.preventDefault()}>
      {/* NTA Header */}
      <div style={{background:"#1a237e",padding:"6px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div>
          <div style={{color:"#fff",fontWeight:900,fontSize:12,letterSpacing:.5}}>National Testing Agency</div>
          <div style={{color:"rgba(255,255,255,.7)",fontSize:9}}>{exam.name}</div>
        </div>
        <div style={{fontFamily:"monospace",fontWeight:900,fontSize:16,background:timer.crit?"#c62828":timer.warn?"#e65100":"#1b5e20",color:"#fff",padding:"5px 14px",borderRadius:5,minWidth:90,textAlign:"center",boxShadow:"0 2px 8px rgba(0,0,0,.3)"}}>
          {timer.fmt}
        </div>
      </div>
      {/* Subject tabs */}
      <div style={{background:"#283593",display:"flex",flexShrink:0,overflowX:"auto"}}>
        {subjs.map(sv=>(
          <button key={sv} onClick={()=>{setSubj(sv);const fi=qs.findIndex(q=>q.subj===sv);if(fi>=0)navTo(fi);}} style={{padding:"8px 16px",background:subj===sv?"#fff":"transparent",color:subj===sv?"#1a237e":"#cfd8dc",border:"none",cursor:"pointer",fontSize:11,fontWeight:700,whiteSpace:"nowrap",flexShrink:0}}>
            {sv}
          </button>
        ))}
        <div style={{flex:1}}/>
        {/* Palette toggle button - RIGHT side */}
        <button onClick={()=>setShowPal(p=>!p)} style={{background:showPal?"#fff":"rgba(255,255,255,.15)",color:showPal?"#1a237e":"#fff",border:"none",padding:"8px 14px",cursor:"pointer",fontSize:11,fontWeight:700,flexShrink:0}}>
          {showPal?"Hide Palette":"Question Palette"}
        </button>
      </div>
      {/* Main content area */}
      <div style={{flex:1,display:"flex",overflow:"hidden"}}>
        {/* Question Panel */}
        <div style={{flex:1,overflow:"auto",background:"#fff",padding:16}}>
          {curQ&&(
            <div>
              {/* Question header */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,paddingBottom:8,borderBottom:"1px solid #e0e0e0"}}>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <span style={{color:"#1a237e",fontSize:13,fontWeight:800}}>Question {cur+1}</span>
                  <span style={{color:"#555",fontSize:11}}>/ {qs.length}</span>
                  <span style={{background:curQ.type==="NUM"?"#fff8e1":"#e8eaf6",color:curQ.type==="NUM"?"#f57f17":"#1a237e",border:`1px solid ${curQ.type==="NUM"?"#f9a825":"#9fa8da"}`,borderRadius:4,padding:"1px 8px",fontSize:10,fontWeight:700}}>
                    {curQ.type==="NUM"?"Integer":"MCQ"}
                  </span>
                  <span style={{background:"#e8f5e9",color:"#2e7d32",borderRadius:4,padding:"1px 8px",fontSize:10,fontWeight:700}}>+{curQ.pos}</span>
                  <span style={{background:"#ffebee",color:"#c62828",borderRadius:4,padding:"1px 8px",fontSize:10,fontWeight:700}}>-{curQ.neg}</span>
                </div>
                <div style={{display:"flex",gap:6}}>
                  <button onClick={()=>setShowNote(p=>!p)} style={{background:showNote?"#e3f2fd":"#f5f5f5",border:"1px solid #ddd",borderRadius:4,padding:"3px 8px",fontSize:10,cursor:"pointer",color:"#1565c0"}}>Notes</button>
                  <button onClick={()=>upd(cur,{bookmarked:!curQ.bookmarked})} style={{background:curQ.bookmarked?"#fff8e1":"#f5f5f5",border:`1px solid ${curQ.bookmarked?"#f9a825":"#ddd"}`,borderRadius:4,padding:"3px 8px",fontSize:11,cursor:"pointer",color:curQ.bookmarked?"#f59e0b":"#999"}}>
                    {curQ.bookmarked?"Bookmarked":"Bookmark"}
                  </button>
                </div>
              </div>
              {showNote&&<textarea value={notes[curQ.id]||""} onChange={e=>setNotes(p=>({...p,[curQ.id]:e.target.value}))} placeholder="Your notes..." rows={2} style={{width:"100%",border:"1px solid #1565c0",borderRadius:6,padding:"6px 10px",fontSize:12,marginBottom:10,resize:"vertical",boxSizing:"border-box"}} />}
              <div style={{fontSize:14,lineHeight:2,color:"#111",marginBottom:20,fontFamily:"Arial,sans-serif"}}>{curQ.t}</div>
              {curQ.type==="NUM"?(
                <div style={{marginBottom:20}}>
                  <div style={{color:"#555",fontSize:12,marginBottom:8,fontWeight:600}}>Enter integer/decimal answer:</div>
                  <input type="number" value={curQ.numVal||""} onChange={e=>upd(cur,{numVal:e.target.value,state:e.target.value.trim()?QS.ANS:QS.NA})} style={{border:"2px solid #1565c0",borderRadius:8,padding:"12px 20px",fontSize:22,textAlign:"center",fontWeight:700,width:200,display:"block",background:"#fafafa"}} placeholder="0" />
                </div>
              ):(
                <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:20}}>
                  {(curQ.opts||[]).map((opt,oi)=>{
                    const sel=curQ.picked.includes(oi);
                    return (
                      <button key={oi} onClick={()=>pick(oi)} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"12px 16px",border:`2px solid ${sel?"#1565c0":"#e0e0e0"}`,borderRadius:8,background:sel?"#e3f2fd":"#fafafa",cursor:"pointer",textAlign:"left"}}>
                        <div style={{width:26,height:26,border:`2px solid ${sel?"#1565c0":"#bbb"}`,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,background:sel?"#1565c0":"#fff",color:sel?"#fff":"#555",fontSize:12,fontWeight:900,marginTop:1}}>
                          {String.fromCharCode(65+oi)}
                        </div>
                        <span style={{fontSize:13,color:"#111",lineHeight:1.7,flex:1}}>{opt}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              {/* NTA official action buttons */}
              <div style={{display:"flex",gap:8,flexWrap:"wrap",borderTop:"2px solid #e8eaf6",paddingTop:14,marginTop:4}}>
                <button onClick={saveNext} style={{padding:"9px 16px",background:"#1a237e",color:"#fff",border:"none",borderRadius:5,cursor:"pointer",fontSize:12,fontWeight:700}}>Save &amp; Next</button>
                <button onClick={markReview} style={{padding:"9px 16px",background:"#7b1fa2",color:"#fff",border:"none",borderRadius:5,cursor:"pointer",fontSize:12,fontWeight:700}}>Mark for Review &amp; Next</button>
                <button onClick={clearResp} style={{padding:"9px 16px",background:"#b71c1c",color:"#fff",border:"none",borderRadius:5,cursor:"pointer",fontSize:12,fontWeight:700}}>Clear Response</button>
                <button onClick={()=>cur>0&&navTo(cur-1)} style={{padding:"9px 16px",background:"#455a64",color:"#fff",border:"none",borderRadius:5,cursor:"pointer",fontSize:12,fontWeight:700,marginLeft:"auto"}}>Back</button>
                <button onClick={()=>setShowConfirm(true)} style={{padding:"9px 18px",background:"#1b5e20",color:"#fff",border:"none",borderRadius:5,cursor:"pointer",fontSize:12,fontWeight:800}}>Submit</button>
              </div>
            </div>
          )}
        </div>
        {/* NTA Palette - sidebar, toggleable, does NOT auto-open */}
        {showPal&&(
          <div style={{width:210,flexShrink:0,borderLeft:"2px solid #c5cae9",overflowY:"auto",display:"flex",flexDirection:"column"}}>
            <PalettePanel onClose={null} />
          </div>
        )}
      </div>
      {/* Submit modal */}
      {showConfirm&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:"#fff",borderRadius:12,padding:24,maxWidth:380,width:"100%",textAlign:"center"}}>
            <div style={{color:"#1a237e",fontWeight:900,fontSize:18,marginBottom:16}}>Confirm Submission</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:20}}>
              {[["Answered",answered,"#10b981"],["Not Answered",notDone,"#ef4444"],["For Review",markedR,"#8b5cf6"]].map(([l,v,c])=>(
                <div key={l} style={{background:c+"15",border:`1px solid ${c}40`,borderRadius:8,padding:"10px 6px",textAlign:"center"}}>
                  <div style={{fontSize:22,fontWeight:900,color:c}}>{v}</div>
                  <div style={{fontSize:9,color:"#555",marginTop:2}}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{color:"#555",fontSize:12,marginBottom:20}}>Are you sure you want to submit? You cannot change answers after submission.</div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setShowConfirm(false)} style={{flex:1,padding:"12px",background:"#f5f5f5",color:"#333",border:"1px solid #ddd",borderRadius:7,cursor:"pointer",fontSize:13,fontWeight:700}}>Cancel</button>
              <button onClick={()=>{setShowConfirm(false);doSubmit();}} style={{flex:1,padding:"12px",background:"#1b5e20",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:13,fontWeight:800}}>Submit</button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}*{box-sizing:border-box;}`}</style>
    </div>
  );

  // Generic UI for non-NTA exams (SAT, GRE, CAT etc.)
  return (
    <div style={{height:"100%",background:"#0a0a1a",display:"flex",flexDirection:"column"}} onContextMenu={e=>e.preventDefault()}>
      {/* Header */}
      <div style={{background:exam.color||"#1a237e",padding:"8px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div>
          <div style={{color:"#fff",fontWeight:900,fontSize:13}}>{exam.name}</div>
          <div style={{color:"rgba(255,255,255,.6)",fontSize:10}}>{exam.country} - Official Pattern</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{fontFamily:"monospace",fontWeight:900,fontSize:15,background:timer.crit?"#c62828":timer.warn?"#e65100":"rgba(0,0,0,.3)",color:"#fff",padding:"5px 12px",borderRadius:6}}>
            {timer.fmt}
          </div>
          <button onClick={()=>setShowPal(p=>!p)} style={{background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",color:"#fff",borderRadius:6,padding:"5px 10px",fontSize:10,fontWeight:700,cursor:"pointer"}}>
            {showPal?"Hide":"Palette"}
          </button>
        </div>
      </div>
      {/* Sections */}
      <div style={{background:"rgba(0,0,0,.3)",display:"flex",flexShrink:0,overflowX:"auto",borderBottom:"1px solid rgba(255,255,255,.1)"}}>
        {subjs.map(sv=>(
          <button key={sv} onClick={()=>{setSubj(sv);const fi=qs.findIndex(q=>q.subj===sv);if(fi>=0)navTo(fi);}} style={{padding:"8px 16px",background:subj===sv?"rgba(255,255,255,.15)":"transparent",color:subj===sv?"#fff":"rgba(255,255,255,.5)",border:"none",cursor:"pointer",fontSize:11,fontWeight:700,whiteSpace:"nowrap",borderBottom:subj===sv?"2px solid #fff":"2px solid transparent"}}>
            {sv}
          </button>
        ))}
      </div>
      <div style={{flex:1,display:"flex",overflow:"hidden"}}>
        <div style={{flex:1,overflow:"auto",padding:16,background:"#fff"}}>
          {curQ&&(
            <div>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <span style={{color:"#333",fontWeight:700,fontSize:12}}>Q{cur+1}/{qs.length}</span>
                  <span style={{background:"#e8f5e9",color:"#2e7d32",borderRadius:4,padding:"1px 6px",fontSize:10,fontWeight:700}}>+{curQ.pos}</span>
                  {curQ.neg>0&&<span style={{background:"#ffebee",color:"#c62828",borderRadius:4,padding:"1px 6px",fontSize:10,fontWeight:700}}>-{curQ.neg}</span>}
                </div>
              </div>
              <div style={{fontSize:14,lineHeight:1.9,color:"#111",marginBottom:18}}>{curQ.t}</div>
              <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>
                {(curQ.opts||[]).map((opt,oi)=>{
                  const sel=curQ.picked.includes(oi);
                  return (
                    <button key={oi} onClick={()=>pick(oi)} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",border:`2px solid ${sel?"#1565c0":"#e0e0e0"}`,borderRadius:8,background:sel?"#e3f2fd":"#fff",cursor:"pointer",textAlign:"left"}}>
                      <div style={{width:24,height:24,border:`2px solid ${sel?"#1565c0":"#ccc"}`,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,background:sel?"#1565c0":"transparent",color:sel?"#fff":"#888",fontSize:11,fontWeight:700}}>
                        {String.fromCharCode(65+oi)}
                      </div>
                      <span style={{fontSize:13,color:"#111",flex:1}}>{opt}</span>
                    </button>
                  );
                })}
              </div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",borderTop:"1px solid #eee",paddingTop:12}}>
                <button onClick={saveNext} style={{padding:"9px 14px",background:exam.color||"#1a237e",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:700}}>Save &amp; Next</button>
                <button onClick={markReview} style={{padding:"9px 14px",background:"#7b1fa2",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:700}}>Mark Review</button>
                <button onClick={clearResp} style={{padding:"9px 14px",background:"#ef4444",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:700}}>Clear</button>
                <button onClick={()=>cur>0&&navTo(cur-1)} style={{padding:"9px 14px",background:"#64748b",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:700}}>Back</button>
                <button onClick={()=>setShowConfirm(true)} style={{padding:"9px 18px",background:"#1b5e20",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:800,marginLeft:"auto"}}>Submit</button>
              </div>
            </div>
          )}
        </div>
        {showPal&&(
          <div style={{width:200,flexShrink:0,borderLeft:"1px solid #e0e0e0"}}>
            <PalettePanel onClose={()=>setShowPal(false)} />
          </div>
        )}
      </div>
      {showConfirm&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:"#fff",borderRadius:12,padding:24,maxWidth:340,width:"100%",textAlign:"center"}}>
            <div style={{fontWeight:900,fontSize:18,marginBottom:12,color:"#111"}}>Submit Test?</div>
            <div style={{color:"#555",fontSize:13,marginBottom:8}}>{answered} answered | {notDone} remaining</div>
            <div style={{display:"flex",gap:10,marginTop:16}}>
              <button onClick={()=>setShowConfirm(false)} style={{flex:1,padding:"12px",background:"#f5f5f5",border:"1px solid #ddd",borderRadius:8,cursor:"pointer",fontWeight:700}}>Cancel</button>
              <button onClick={()=>{setShowConfirm(false);doSubmit();}} style={{flex:1,padding:"12px",background:"#1b5e20",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontWeight:800}}>Submit</button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}*{box-sizing:border-box;}`}</style>
    </div>
  );
}

// ============================================================
// RESULT SCREEN
// ============================================================
function ResultScreen({result, onBack, onRetake}){
  const [tab,setTab]=useState("overview");
  const {score,total,correct,wrong,skipped,bySubj,timeTaken,totalQ,exam}=result;
  const pct=total?Math.max(0,Math.round(score/total*100)):0;
  const acc=totalQ?Math.round(correct/totalQ*100):0;

  return (
    <div style={{height:"100%",background:"#08101a",display:"flex",flexDirection:"column"}}>
      <div style={{background:exam?.color||"#1a237e",padding:"12px 16px",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
        <button onClick={onBack} style={{background:"none",border:"none",color:"#fff",fontSize:22,cursor:"pointer"}}>&#8592;</button>
        <div>
          <div style={{color:"#fff",fontWeight:900,fontSize:14}}>{exam?.name} - Result</div>
          <div style={{color:"rgba(255,255,255,.6)",fontSize:10}}>Test completed</div>
        </div>
      </div>
      <div style={{background:"linear-gradient(180deg,rgba(26,35,126,.8),rgba(8,16,26,1))",padding:"20px 16px",textAlign:"center",flexShrink:0}}>
        <div style={{fontSize:56,fontWeight:900,color:pct>=60?"#10b981":pct>=40?"#f59e0b":"#ef4444"}}>{pct}%</div>
        <div style={{color:"rgba(255,255,255,.6)",fontSize:13}}>Score: {score} / {total}</div>
        <div style={{display:"flex",justifyContent:"center",gap:20,marginTop:14}}>
          {[{l:"Correct",v:correct,c:"#10b981"},{l:"Wrong",v:wrong,c:"#ef4444"},{l:"Skipped",v:skipped,c:"#6b7280"},{l:"Accuracy",v:acc+"%",c:"#6366f1"}].map(m=>(
            <div key={m.l} style={{textAlign:"center"}}>
              <div style={{color:m.c,fontWeight:900,fontSize:20}}>{m.v}</div>
              <div style={{color:"rgba(255,255,255,.4)",fontSize:10}}>{m.l}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{display:"flex",background:"#0d1b2a",borderBottom:"1px solid #1a2840",flexShrink:0}}>
        {[["overview","Overview"],["subjects","By Subject"],["qs","Questions"]].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:"10px",background:"none",border:"none",borderBottom:`2px solid ${tab===t?"#6366f1":"transparent"}`,color:tab===t?"#6366f1":"#8892b0",fontSize:11,fontWeight:700,cursor:"pointer"}}>{l}</button>
        ))}
      </div>
      <div style={{flex:1,overflow:"auto",padding:16}}>
        {tab==="overview"&&(
          <div>
            <div style={{background:"rgba(255,255,255,.05)",borderRadius:12,padding:16,marginBottom:12}}>
              <div style={{color:"rgba(255,255,255,.5)",fontSize:11,marginBottom:8}}>Time Analysis</div>
              <div style={{color:"#fff",fontSize:13}}>Time taken: {Math.floor(timeTaken/60)}m {timeTaken%60}s</div>
              <div style={{color:"rgba(255,255,255,.4)",fontSize:11,marginTop:4}}>Avg per question: {totalQ?Math.round(timeTaken/totalQ):0}s</div>
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={onRetake} style={{flex:1,padding:"13px",background:"#6366f1",color:"#fff",border:"none",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:13}}>Retake</button>
              <button onClick={onBack} style={{flex:1,padding:"13px",background:"rgba(255,255,255,.07)",color:"#fff",border:"1px solid rgba(255,255,255,.15)",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:13}}>Home</button>
            </div>
          </div>
        )}
        {tab==="subjects"&&Object.entries(bySubj||{}).map(([sv,d])=>{
          const sp=d.total?Math.round(d.correct/d.total*100):0;
          return (
            <div key={sv} style={{background:"rgba(255,255,255,.05)",borderRadius:10,padding:14,marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <span style={{color:"#fff",fontWeight:700}}>{sv}</span>
                <span style={{color:sp>=60?"#10b981":sp>=40?"#f59e0b":"#ef4444",fontWeight:700}}>{sp}%</span>
              </div>
              <div style={{display:"flex",gap:12,fontSize:11}}>
                <span style={{color:"#10b981"}}>C:{d.correct}</span>
                <span style={{color:"#ef4444"}}>W:{d.wrong}</span>
                <span style={{color:"#6b7280"}}>S:{d.skipped}</span>
              </div>
              <div style={{height:4,background:"#1a2840",borderRadius:2,marginTop:8}}>
                <div style={{height:"100%",width:sp+"%",background:sp>=60?"#10b981":sp>=40?"#f59e0b":"#ef4444",borderRadius:2}}/>
              </div>
            </div>
          );
        })}
        {tab==="qs"&&(result.questions||[]).map((q,i)=>(
          <div key={i} style={{background:"rgba(255,255,255,.04)",border:`1px solid ${q.result==="correct"?"rgba(16,185,129,.3)":q.result==="wrong"?"rgba(239,68,68,.3)":"rgba(255,255,255,.1)"}`,borderRadius:8,padding:12,marginBottom:8}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
              <span style={{color:"rgba(255,255,255,.4)",fontSize:10}}>Q{i+1} - {q.subj}</span>
              <span style={{color:q.result==="correct"?"#10b981":q.result==="wrong"?"#ef4444":"#6b7280",fontSize:10,fontWeight:700}}>{q.result==="correct"?"Correct":q.result==="wrong"?"Wrong":"Skipped"}</span>
            </div>
            <div style={{color:"rgba(255,255,255,.7)",fontSize:12}}>{(q.t||"").slice(0,100)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// HOME DASHBOARD
// ============================================================
function HomeScreen({user, ctrl, onSelectExam}){
  const results=user.data?.results||[];
  const streak=user.data?.streak||0;
  const isPaid=user.plan==="paid"&&user.planExpiry>Date.now();
  const announce=(ctrl.announcements||[]).slice(0,1)[0];

  const CATS=["All","India","USA","Global","UK"];
  const [cat,setCat]=useState("All");
  const filtered=EXAMS.filter(e=>cat==="All"||e.country===cat||e.cat===cat);

  return (
    <div style={{height:"100%",overflow:"auto",paddingBottom:80}}>
      {announce&&<div style={{background:"linear-gradient(135deg,#7c3aed,#6366f1)",padding:"10px 16px",color:"#fff",fontSize:12,fontWeight:600,display:"flex",alignItems:"center",gap:8}}>
        <span>!</span>{announce.text}
      </div>}
      <div style={{padding:"16px 16px 0"}}>
        <div style={{marginBottom:16}}>
          <div style={{color:"#fff",fontSize:20,fontWeight:900}}>Hello, {user.name}!</div>
          <div style={{color:"rgba(255,255,255,.4)",fontSize:12}}>{isPaid?"Premium Member - All features unlocked":"Free Plan"}</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:20}}>
          {[
            {l:"Streak",v:streak+"d",c:"#f59e0b"},
            {l:"Tests",v:results.length,c:"#10b981"},
            {l:"Best %",v:results.length?Math.max(...results.map(r=>r.total?Math.round(r.score/r.total*100):0))+"%":"--",c:"#6366f1"},
          ].map(m=>(
            <div key={m.l} style={{background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.08)",borderRadius:12,padding:"12px 8px",textAlign:"center"}}>
              <div style={{fontSize:20,fontWeight:900,color:m.c}}>{m.v}</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,.4)",marginTop:2}}>{m.l}</div>
            </div>
          ))}
        </div>
        {results[0]&&(
          <div style={{background:"rgba(99,102,241,.12)",border:"1px solid rgba(99,102,241,.25)",borderRadius:12,padding:14,marginBottom:20}}>
            <div style={{color:"rgba(255,255,255,.5)",fontSize:10,marginBottom:4}}>LAST TEST</div>
            <div style={{color:"#fff",fontWeight:700,fontSize:13}}>{results[0].exam?.name}</div>
            <div style={{color:"#a5b4fc",fontSize:12,marginTop:2}}>Score: {results[0].score}/{results[0].total} | {results[0].correct}C {results[0].wrong}W {results[0].skipped}S</div>
          </div>
        )}
        {/* Category filter */}
        <div style={{display:"flex",gap:8,marginBottom:12,overflowX:"auto",paddingBottom:4}}>
          {CATS.map(c=>(
            <button key={c} onClick={()=>setCat(c)} style={{padding:"5px 14px",background:cat===c?"#6366f1":"rgba(255,255,255,.07)",color:cat===c?"#fff":"rgba(255,255,255,.5)",border:`1px solid ${cat===c?"#6366f1":"rgba(255,255,255,.1)"}`,borderRadius:20,fontSize:11,fontWeight:700,cursor:"pointer",flexShrink:0}}>{c}</button>
          ))}
        </div>
        <div style={{color:"rgba(255,255,255,.6)",fontSize:12,fontWeight:700,marginBottom:10}}>{filtered.length} Exams Available</div>
        {filtered.map(e=>(
          <button key={e.id} onClick={()=>onSelectExam(e)} style={{width:"100%",background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",borderRadius:14,padding:"14px 16px",color:"#fff",textAlign:"left",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <div>
              <div style={{fontWeight:700,fontSize:14,display:"flex",alignItems:"center",gap:8}}>
                {e.name}
                {!isPaid&&e.id!=="JEE_MAIN"&&e.id!=="NEET"&&<span style={{background:"#f59e0b",color:"#000",borderRadius:4,padding:"1px 5px",fontSize:8,fontWeight:900}}>PRO</span>}
              </div>
              <div style={{color:"rgba(255,255,255,.35)",fontSize:10,marginTop:3}}>{e.country} | {e.cat} | {e.totalQ}Q | {e.dur}min | +{e.pos}/-{e.neg}</div>
            </div>
            <div style={{width:32,height:32,background:e.color||"#1a237e",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:11,fontWeight:900,flexShrink:0}}>
              {e.name.charAt(0)}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// GOALS SCREEN
// ============================================================
function GoalsScreen({user, setUser, onBack}){
  const [dailyQ,setDailyQ]=useState(user.data?.goals?.dailyQ||30);
  const [targetScore,setTargetScore]=useState(user.data?.goals?.targetScore||80);
  const [saved,setSaved]=useState(false);

  const save=()=>{
    const upd={...user,data:{...user.data,goals:{...user.data?.goals,dailyQ,targetScore}}};
    if(user.email&&user.email!=="guest@"){const db=LS.get("users_db",{});db[user.email]=upd;LS.set("users_db",db);}
    setUser(upd); setSaved(true); setTimeout(()=>setSaved(false),2000);
  };

  return (
    <div style={{height:"100%",background:"#08101a",display:"flex",flexDirection:"column"}}>
      <div style={{background:"#1a237e",padding:"12px 16px",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
        <button onClick={onBack} style={{background:"none",border:"none",color:"#fff",fontSize:22,cursor:"pointer"}}>&#8592;</button>
        <div style={{color:"#fff",fontWeight:900,fontSize:14}}>Study Goals</div>
      </div>
      <div style={{flex:1,overflow:"auto",padding:16}}>
        {saved&&<div style={{background:"rgba(16,185,129,.15)",border:"1px solid rgba(16,185,129,.3)",borderRadius:8,padding:"8px 12px",color:"#10b981",fontSize:12,marginBottom:12,textAlign:"center"}}>Goals saved!</div>}
        <div style={{background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",borderRadius:12,padding:16,marginBottom:12}}>
          <label style={{color:"rgba(255,255,255,.6)",fontSize:12,display:"block",marginBottom:8}}>Daily Questions Target: <b style={{color:"#fff"}}>{dailyQ}</b></label>
          <input type="range" min={10} max={100} step={5} value={dailyQ} onChange={e=>setDailyQ(+e.target.value)} style={{width:"100%"}} />
        </div>
        <div style={{background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",borderRadius:12,padding:16,marginBottom:20}}>
          <label style={{color:"rgba(255,255,255,.6)",fontSize:12,display:"block",marginBottom:8}}>Target Score: <b style={{color:"#fff"}}>{targetScore}%</b></label>
          <input type="range" min={30} max={100} step={5} value={targetScore} onChange={e=>setTargetScore(+e.target.value)} style={{width:"100%"}} />
        </div>
        <button onClick={save} style={{width:"100%",background:"#6366f1",color:"#fff",border:"none",borderRadius:12,padding:"13px",fontSize:14,fontWeight:800,cursor:"pointer"}}>Save Goals</button>
        <div style={{marginTop:24}}>
          <div style={{color:"rgba(255,255,255,.5)",fontSize:11,fontWeight:700,marginBottom:12}}>YOUR STATS</div>
          {[
            ["Tests Completed",(user.data?.results||[]).length],
            ["Streak",`${user.data?.streak||0} days`],
            ["XP Points",user.data?.xp||0],
            ["Plan",user.plan==="paid"?"Premium":"Free"],
          ].map(([l,v])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,.08)"}}>
              <span style={{color:"rgba(255,255,255,.5)",fontSize:13}}>{l}</span>
              <span style={{color:"#fff",fontWeight:700,fontSize:13}}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ROOT APP
// ============================================================
export default function App(){
  const [user,setUserState]=useState(null);
  const [screen,setScreen]=useState("home");
  const [examFlow,setExamFlow]=useState(null);
  const ctrl=LS.get(CTRL_KEY,{apps:{free:true},maintenance:{free:false},features:{},announcements:[]});

  useEffect(()=>{
    const s=LS.get("active_session",null);
    if(s&&Date.now()-s.ts<30*24*3600000){
      const db=LS.get("users_db",{});
      if(db[s.email]) setUserState(db[s.email]);
    }
  },[]);

  const setUser=(u)=>{
    setUserState(u);
    if(u&&u.email&&u.email!=="guest@"){
      const db=LS.get("users_db",{});db[u.email]=u;LS.set("users_db",db);
    }
  };

  const nav=(s)=>{setScreen(s);setExamFlow(null);};

  if(ctrl.apps?.free===false) return (
    <div style={{minHeight:"100vh",background:"#0a0a1a",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",textAlign:"center",padding:20}}>
      <div><div style={{fontSize:48,marginBottom:16}}>&#128274;</div><div style={{fontSize:20,fontWeight:700}}>App Offline</div><div style={{color:"rgba(255,255,255,.5)",marginTop:8}}>{ctrl.maintenanceMsg||"Back soon!"}</div></div>
    </div>
  );

  if(!user) return <AuthScreen onAuth={u=>{setUserState(u);if(u.email!=="guest@")LS.set("active_session",{email:u.email,ts:Date.now()});}} />;

  // Exam flows
  if(examFlow?.stage==="instructions") return (
    <InstructionScreen exam={examFlow.exam} onBack={()=>setExamFlow(null)} onStart={()=>{
      const questions=buildExam(examFlow.exam);
      setExamFlow({stage:"active",exam:examFlow.exam,questions});
    }} />
  );

  if(examFlow?.stage==="active") return (
    <ActiveExam exam={examFlow.exam} questions={examFlow.questions} onSubmit={r=>{
      const res={...r,ts:Date.now()};
      const updUser={...user,data:{...user.data,results:[res,...(user.data?.results||[])].slice(0,100),xp:(user.data?.xp||0)+50}};
      setUser(updUser);
      setExamFlow({stage:"result",result:res});
    }} />
  );

  if(examFlow?.stage==="result") return (
    <ResultScreen result={examFlow.result} onBack={()=>{setExamFlow(null);setScreen("home");}} onRetake={()=>{
      const questions=buildExam(examFlow.result.exam);
      setExamFlow({stage:"active",exam:examFlow.result.exam,questions});
    }} />
  );

  const renderScreen=()=>{
    if(screen==="goals") return <GoalsScreen user={user} setUser={setUser} onBack={()=>nav("home")} />;
    if(screen==="upgrade") return <UpgradeScreen user={user} setUser={setUser} onBack={()=>nav("home")} />;
    return <HomeScreen user={user} ctrl={ctrl} onSelectExam={e=>{setExamFlow({stage:"instructions",exam:e});}} />;
  };

  const NAV=[{id:"home",label:"Home",icon:"H"},{id:"goals",label:"Goals",icon:"G"},{id:"upgrade",label:user.plan==="paid"&&user.planExpiry>Date.now()?"Premium":"Upgrade",icon:"U"}];

  return (
    <div style={{height:"100vh",background:"#08101a",display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{flex:1,overflow:"hidden",position:"relative"}}>{renderScreen()}</div>
      <div style={{background:"#060c18",borderTop:"1px solid #1a2840",display:"flex",flexShrink:0}}>
        {NAV.map(n=>(
          <button key={n.id} onClick={()=>nav(n.id)} style={{flex:1,padding:"10px 4px 8px",background:"none",border:"none",borderTop:`2px solid ${screen===n.id?"#6366f1":"transparent"}`,color:screen===n.id?"#6366f1":"#8892b0",fontSize:10,fontWeight:700,cursor:"pointer"}}>
            {n.label}
          </button>
        ))}
      </div>
    </div>
  );
}
