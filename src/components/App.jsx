// HSA Vault v5 - 1777423764
import { useState, useEffect, useRef } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/config";
import { useExpenses } from "../hooks/useExpenses";

/* ── Constants ──────────────────────────────────────────────────────────── */
const CATEGORIES = ["Doctor & Hospital","Dental","Vision","Prescriptions & OTC","Mental Health","Therapy & Rehab","Lab & Diagnostics","Medical Devices","Long-Term Care","Women's Health","Other"];
const PAYMENT_TYPES = ["Cash","Credit Card","Debit Card","Check","HSA Card","FSA Card","Other"];
const CAT_COLORS = {
  "Doctor & Hospital":"#38bdf8","Dental":"#fbbf24","Vision":"#c084fc",
  "Prescriptions & OTC":"#f472b6","Mental Health":"#34d399","Therapy & Rehab":"#2dd4bf",
  "Lab & Diagnostics":"#fb923c","Medical Devices":"#818cf8","Long-Term Care":"#e879f9",
  "Women's Health":"#f9a8d4","Other":"#94a3b8",
  // Legacy names from previous version
  "Medical":"#38bdf8","Prescription":"#f472b6","Physical Therapy":"#2dd4bf",
  "Lab / Testing":"#fb923c","Equipment":"#818cf8",
};
const CAT_ICONS = {
  "Doctor & Hospital":"🏥","Dental":"🦷","Vision":"👁","Prescriptions & OTC":"💊",
  "Mental Health":"🧠","Therapy & Rehab":"🏃","Lab & Diagnostics":"🧪",
  "Medical Devices":"🩺","Long-Term Care":"🏡","Women's Health":"🌸","Other":"📋",
  // Legacy names
  "Medical":"🏥","Prescription":"💊","Physical Therapy":"🏃",
  "Lab / Testing":"🧪","Equipment":"🩺",
};

const fmt     = n  => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(n||0);
const fmtDate = s  => { if(!s) return ""; const d=new Date(s+"T00:00:00"); return d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}); };
const uid     = () => Math.random().toString(36).slice(2)+Date.now().toString(36);
const CY      = new Date().getFullYear();
const YEARS   = Array.from({length:10},(_,i)=>CY-i);

/* ── Eligible Expenses Data (IRS Pub 502, 2024) ─────────────────────────── */
const ELIGIBLE = {
  "Doctor & Hospital":[
    {n:"Doctor visits & copays",d:"Any licensed physician, surgeon, or specialist"},
    {n:"Hospital services",d:"Inpatient and outpatient care, room and board"},
    {n:"Urgent care & emergency room",d:"Walk-in and ER visits"},
    {n:"Surgery & operations",d:"Medically necessary procedures"},
    {n:"Ambulance services",d:"Emergency transportation"},
    {n:"Annual physical exam",d:"Preventive checkups"},
    {n:"Chiropractor",d:"Spinal manipulation and adjustments"},
    {n:"Acupuncture",d:"Licensed acupuncture treatment"},
    {n:"Organ transplants",d:"Donor and recipient costs"},
    {n:"Nursing services",d:"Private nurse or home health aide"},
    {n:"Vaccinations & immunizations",d:"Flu shots, travel vaccines, etc."},
    {n:"Stop-smoking programs",d:"Prescribed cessation treatments"},
    {n:"Weight-loss program",d:"Only if prescribed to treat a specific disease"},
    {n:"Lodging for medical care",d:"Up to $50/night while away for treatment"},
    {n:"Transportation to appointments",d:"Mileage, bus, taxi for medical care"},
    {n:"Oxygen & equipment",d:"Prescribed respiratory supplies"},
  ],
  "Dental":[
    {n:"Cleanings & exams",d:"Preventive dental care"},
    {n:"Fillings & crowns",d:"Restorative dental work"},
    {n:"Tooth extractions",d:"Including wisdom teeth removal"},
    {n:"Root canals",d:"Endodontic treatment"},
    {n:"Dentures & bridges",d:"Artificial teeth and prosthetics"},
    {n:"Orthodontia & braces",d:"Teeth straightening"},
    {n:"Dental implants",d:"Permanent tooth replacements"},
    {n:"Periodontal treatment",d:"Gum disease treatment"},
    {n:"Dental X-rays",d:"Dental imaging"},
    {n:"Oral surgery",d:"Medically necessary procedures"},
  ],
  "Vision":[
    {n:"Eye exams",d:"Optometrist or ophthalmologist visits"},
    {n:"Eyeglasses",d:"Prescription lenses and frames"},
    {n:"Contact lenses & supplies",d:"Lenses, solution, cases"},
    {n:"LASIK & vision correction surgery",d:"Laser eye surgery"},
    {n:"Cataract surgery",d:"Lens replacement"},
    {n:"Glaucoma treatment",d:"Drops, surgery, monitoring"},
    {n:"Low-vision aids",d:"Magnifiers for vision impairment"},
  ],
  "Prescriptions & OTC":[
    {n:"Prescription drugs",d:"Any medication requiring a prescription"},
    {n:"Insulin",d:"Always eligible — no prescription required"},
    {n:"Over-the-counter medicines",d:"Cold, pain, allergy meds (post-CARES Act 2020)"},
    {n:"Menstrual care products",d:"Tampons, pads, cups (added by CARES Act)"},
    {n:"Condoms",d:"Added by IRS Notice 2024-75"},
    {n:"Birth control pills",d:"Prescribed contraceptives"},
    {n:"Fertility drugs",d:"Prescribed fertility medications"},
    {n:"Bandages & wound care",d:"Gauze, adhesive bandages, medical tape"},
    {n:"Pregnancy test kits",d:"Home pregnancy tests"},
    {n:"Continuous glucose monitors",d:"For diabetes management (IRS Notice 2024-75)"},
  ],
  "Mental Health":[
    {n:"Therapy & counseling",d:"Psychologists, therapists, licensed counselors"},
    {n:"Psychiatrist visits",d:"Evaluations and medication management"},
    {n:"Inpatient mental health treatment",d:"Residential programs"},
    {n:"Addiction treatment",d:"Alcohol, drug, substance use programs"},
    {n:"Eating disorder treatment",d:"Inpatient and outpatient programs"},
    {n:"Mental health prescriptions",d:"Antidepressants, anti-anxiety, mood stabilizers"},
    {n:"Crisis intervention",d:"Emergency mental health services"},
  ],
  "Therapy & Rehab":[
    {n:"Physical therapy",d:"PT for injury, surgery recovery, chronic conditions"},
    {n:"Occupational therapy",d:"OT for daily function and disability"},
    {n:"Speech therapy",d:"Treatment for speech and swallowing disorders"},
    {n:"Respiratory therapy",d:"Breathing treatments and exercises"},
    {n:"Cardiac rehabilitation",d:"Post-heart attack or surgery recovery"},
    {n:"Drug & alcohol rehabilitation",d:"Inpatient and outpatient rehab"},
    {n:"Guide dog & service animal",d:"Purchase and ongoing care costs"},
  ],
  "Lab & Diagnostics":[
    {n:"Blood tests & labs",d:"Any ordered laboratory work"},
    {n:"X-rays & imaging",d:"Radiological diagnostics"},
    {n:"MRI & CT scans",d:"Advanced imaging"},
    {n:"Ultrasounds",d:"Diagnostic imaging"},
    {n:"Genetic testing",d:"When ordered by a physician"},
    {n:"Allergy testing",d:"Skin and blood allergy panels"},
    {n:"Biopsy",d:"Tissue sampling for diagnosis"},
    {n:"STI & HIV testing",d:"Diagnostic screenings"},
  ],
  "Medical Devices":[
    {n:"Hearing aids & batteries",d:"Devices and ongoing supplies"},
    {n:"CPAP machines & supplies",d:"Sleep apnea treatment equipment"},
    {n:"Wheelchair & scooter",d:"Mobility assistance devices"},
    {n:"Crutches, canes & walkers",d:"Mobility aids"},
    {n:"Prosthetic limbs",d:"Artificial arms, legs, and limbs"},
    {n:"Insulin pumps",d:"Continuous insulin delivery devices"},
    {n:"Pacemakers",d:"Implanted cardiac devices"},
    {n:"Hospital bed (home use)",d:"If required for home medical care"},
    {n:"Stair lifts",d:"If medically necessary for disability"},
    {n:"Wigs",d:"Hair loss due to disease or treatment"},
    {n:"Braille books & materials",d:"For visually impaired individuals"},
  ],
  "Long-Term Care":[
    {n:"Nursing home care",d:"Full-time care in a nursing facility"},
    {n:"Assisted living",d:"If primarily for medical care"},
    {n:"Home health aide",d:"Licensed aide providing medical care"},
    {n:"Long-term care insurance premiums",d:"Limited deductible amount based on age"},
    {n:"Disabled dependent care",d:"Care expenses for a disabled dependent"},
    {n:"Lifetime care advance payments",d:"Fees to continuing care retirement communities"},
  ],
  "Women's Health":[
    {n:"Breast pumps & lactation supplies",d:"Pumps, storage bags, nursing pads"},
    {n:"Lactation consulting",d:"Professional breastfeeding support"},
    {n:"Fertility treatments",d:"IVF, egg freezing, artificial insemination"},
    {n:"Pregnancy care & OB visits",d:"Prenatal and obstetric appointments"},
    {n:"Abortion",d:"Explicitly listed in IRS Publication 502"},
    {n:"Sterilization",d:"Tubal ligation"},
    {n:"Breast reconstruction surgery",d:"Following mastectomy"},
    {n:"Midwife services",d:"Licensed midwife prenatal and delivery care"},
    {n:"Postpartum care",d:"Medical care after delivery"},
  ],
  "Other":[
    {n:"Medical alert bracelet",d:"Emergency identification for medical conditions"},
    {n:"Personal protective equipment",d:"Masks, gloves for medical purposes"},
    {n:"Medicare Part B & D premiums",d:"Supplemental and prescription coverage"},
    {n:"COBRA premiums",d:"Continuation coverage after job loss"},
    {n:"Vasectomy",d:"Male sterilization procedure"},
    {n:"Legal fees for mental health care",d:"Fees to authorize treatment for a mentally ill person"},
  ],
};

const NOT_ELIGIBLE = [
  {n:"Toothpaste",d:"Personal hygiene — not treating a specific disease"},
  {n:"Toothbrush",d:"Personal hygiene — not treating a specific disease"},
  {n:"Mouthwash",d:"General oral hygiene — not a medical expense"},
  {n:"Floss",d:"Personal hygiene — not eligible"},
  {n:"Teeth whitening",d:"Cosmetic — explicitly excluded in Pub. 502"},
  {n:"Soap & body wash",d:"Personal hygiene — not a medical expense"},
  {n:"Shampoo & conditioner",d:"Personal hygiene — not eligible"},
  {n:"Deodorant",d:"Personal hygiene — not a medical expense"},
  {n:"Lotion & moisturizer",d:"General skincare — not eligible unless prescribed"},
  {n:"Hair transplants",d:"Cosmetic — explicitly excluded in Pub. 502"},
  {n:"Electrolysis / hair removal",d:"Cosmetic — explicitly excluded"},
  {n:"Cosmetic surgery",d:"Not eligible unless correcting disease-caused disfigurement"},
  {n:"Teeth whitening strips",d:"Cosmetic — not eligible"},
  {n:"Gym membership",d:"General health — not eligible unless prescribed for a specific disease"},
  {n:"Health club dues",d:"General wellness — explicitly excluded in Pub. 502"},
  {n:"Swimming lessons",d:"General health — not eligible"},
  {n:"Dancing lessons",d:"Explicitly listed as ineligible in Pub. 502"},
  {n:"Personal trainer",d:"General fitness — not a medical expense"},
  {n:"Vitamins & supplements",d:"Only eligible if prescribed for a specific diagnosed condition"},
  {n:"Protein powder",d:"Nutritional supplement — not eligible"},
  {n:"Essential oils",d:"General wellness — not a qualified medical expense"},
  {n:"Meditation app subscription",d:"General wellness — not eligible unless prescribed"},
  {n:"Vacation",d:"Even if rest is recommended by a doctor — not eligible"},
  {n:"Diet food",d:"Specially prepared diet food is not deductible"},
  {n:"Maternity clothes",d:"Explicitly excluded in Pub. 502"},
  {n:"Baby diapers & diaper service",d:"Normal childcare — not a medical expense"},
  {n:"Baby formula",d:"Not eligible unless prescribed for a specific condition"},
  {n:"Babysitting & childcare",d:"Not eligible unless caring for a disabled dependent"},
  {n:"Household help",d:"Cleaning, cooking — not a medical expense"},
  {n:"Life insurance premiums",d:"Not a medical expense"},
  {n:"Medigap premiums",d:"Explicitly excluded — cannot use HSA funds"},
  {n:"Funeral expenses",d:"Not a medical expense"},
  {n:"Veterinary fees",d:"Pet care — not a human medical expense"},
  {n:"Controlled substances",d:"Illegal under federal law regardless of state law"},
  {n:"Surrogacy expenses",d:"Explicitly excluded as of current IRS guidance"},
  {n:"Non-prescribed marijuana",d:"Still illegal federally — not an eligible HSA expense"},
  {n:"Air purifier (general use)",d:"Only eligible if prescribed for a specific respiratory condition"},
  {n:"Standing desk / ergonomic furniture",d:"Not eligible without a physician prescription"},
  {n:"Meal delivery services",d:"Convenience — not a medical expense"},
  {n:"Non-prescription weight loss supplements",d:"General wellness — not eligible without a diagnosis"},
];

/* ── Global CSS ──────────────────────────────────────────────────────────── */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=DM+Serif+Display:ital@0;1&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{background:#020509;overflow-x:hidden}
  ::-webkit-scrollbar{display:none}
  input[type=date]::-webkit-calendar-picker-indicator{filter:invert(0.5) brightness(1.5);cursor:pointer}
  input::placeholder{color:rgba(148,163,184,0.35)}
  select option{background:#0d1117;color:#e2e8f0}
  @keyframes meshDrift{0%{transform:translate(0,0) scale(1)}33%{transform:translate(40px,-30px) scale(1.08)}66%{transform:translate(-25px,35px) scale(0.96)}100%{transform:translate(0,0) scale(1)}}
  @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
  @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
  @keyframes slideIn{from{opacity:0;transform:translateY(100%)}to{opacity:1;transform:translateY(0)}}
  @keyframes checkPop{0%{transform:scale(0) rotate(-20deg)}60%{transform:scale(1.3) rotate(5deg)}100%{transform:scale(1) rotate(0deg)}}
  @keyframes glowPulse{0%,100%{box-shadow:0 0 20px rgba(56,189,248,0.2),0 8px 32px rgba(14,165,233,0.4)}50%{box-shadow:0 0 40px rgba(56,189,248,0.55),0 8px 48px rgba(14,165,233,0.6)}}
  @keyframes barFill{from{width:0%}}
  @keyframes floatY{0%,100%{transform:translateY(0px)}50%{transform:translateY(-12px)}}
  @keyframes onboardIn{from{opacity:0;transform:translateY(28px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}}
  .fu{animation:fadeUp 0.55s cubic-bezier(0.22,1,0.36,1) both}
  .fu1{animation:fadeUp 0.55s 0.06s cubic-bezier(0.22,1,0.36,1) both}
  .fu2{animation:fadeUp 0.55s 0.12s cubic-bezier(0.22,1,0.36,1) both}
  .fu3{animation:fadeUp 0.55s 0.18s cubic-bezier(0.22,1,0.36,1) both}
  .fu4{animation:fadeUp 0.55s 0.24s cubic-bezier(0.22,1,0.36,1) both}
  .fu5{animation:fadeUp 0.55s 0.30s cubic-bezier(0.22,1,0.36,1) both}
  .slide-in{animation:slideIn 0.45s cubic-bezier(0.32,0.72,0,1) both}
  .ob-in{animation:onboardIn 0.65s cubic-bezier(0.22,1,0.36,1) both}
  .glass{background:rgba(15,23,42,0.55);backdrop-filter:blur(20px) saturate(180%);-webkit-backdrop-filter:blur(20px) saturate(180%);border:1px solid rgba(255,255,255,0.08)}
  .shimmer-text{background:linear-gradient(90deg,#94a3b8 0%,#e2e8f0 40%,#38bdf8 60%,#94a3b8 100%);background-size:200% auto;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;animation:shimmer 4s linear infinite}
  .glow-btn{position:relative;overflow:hidden;transition:transform 0.15s,box-shadow 0.2s}
  .glow-btn:active{transform:scale(0.97)}
  .glow-btn::after{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,0.14) 0%,transparent 60%);pointer-events:none}
  .exp-row{transition:background 0.2s,transform 0.15s;border-radius:14px;padding:14px 12px;margin-bottom:4px}
  .exp-row:active{transform:scale(0.99);background:rgba(255,255,255,0.03)}
  .chk:active{transform:scale(0.88)}
  .pill{transition:all 0.2s}.pill:active{transform:scale(0.94)}
  .float-icon{animation:floatY 4s ease-in-out infinite}
`;

/* ── Ambient Background ──────────────────────────────────────────────────── */
function BG() {
  return (
    <div style={{position:"fixed",inset:0,zIndex:0,overflow:"hidden",pointerEvents:"none"}}>
      <div style={{position:"absolute",inset:0,background:"linear-gradient(160deg,#020509 0%,#040d1a 50%,#020509 100%)"}}/>
      <div style={{position:"absolute",width:600,height:600,borderRadius:"50%",background:"radial-gradient(circle,rgba(56,189,248,0.12) 0%,transparent 70%)",top:"-150px",left:"-100px",animation:"meshDrift 18s ease-in-out infinite"}}/>
      <div style={{position:"absolute",width:500,height:500,borderRadius:"50%",background:"radial-gradient(circle,rgba(139,92,246,0.1) 0%,transparent 70%)",top:"30%",right:"-120px",animation:"meshDrift 22s 3s ease-in-out infinite reverse"}}/>
      <div style={{position:"absolute",width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle,rgba(52,211,153,0.08) 0%,transparent 70%)",bottom:"-80px",left:"20%",animation:"meshDrift 26s 6s ease-in-out infinite"}}/>
      <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(56,189,248,0.022) 1px,transparent 1px),linear-gradient(90deg,rgba(56,189,248,0.022) 1px,transparent 1px)",backgroundSize:"48px 48px"}}/>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   ONBOARDING SLIDES
══════════════════════════════════════════════════════════════════════ */
function SlideWhat() {
  return (
    <div className="ob-in" style={{padding:"0 24px 32px"}}>
      <div style={{display:"flex",justifyContent:"center",marginBottom:24,marginTop:4}}>
        <div className="float-icon" style={{width:90,height:90,borderRadius:24,background:"radial-gradient(circle at 35% 35%,rgba(251,191,36,0.25),rgba(251,191,36,0.06))",border:"1px solid rgba(251,191,36,0.35)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:44,boxShadow:"0 0 36px rgba(251,191,36,0.35)"}}>🏦</div>
      </div>
      <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.18em",textTransform:"uppercase",color:"#fbbf24",marginBottom:10,textAlign:"center"}}>What is an HSA?</div>
      <div style={{fontFamily:"'DM Serif Display',serif",fontSize:26,lineHeight:1.3,color:"#f8fafc",textAlign:"center",marginBottom:16}}>
        A tax-advantaged account designed to help you save for medical expenses.
      </div>
      <div style={{fontSize:14,lineHeight:1.8,color:"rgba(148,163,184,0.85)",marginBottom:18}}>
        If you're enrolled in a high-deductible health plan (HDHP), you're eligible to open and contribute to an HSA. Unlike an FSA, your HSA balance rolls over every year — it never expires.
      </div>
      <div style={{fontSize:14,lineHeight:1.8,color:"rgba(148,163,184,0.85)",marginBottom:20}}>
        Most people use it like a debit card for doctor visits. But there's a far more powerful strategy — one that can add hundreds of thousands of dollars to your retirement.
      </div>
      <div style={{background:"rgba(251,191,36,0.08)",border:"1px solid rgba(251,191,36,0.2)",borderRadius:16,padding:"16px 18px"}}>
        <div style={{fontSize:11,fontWeight:700,color:"#fbbf24",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:12}}>The Triple Tax Advantage</div>
        {[
          ["1","Contributions reduce your taxable income","Money goes in pre-tax, lowering your tax bill today."],
          ["2","Growth is completely tax-free","Invest in index funds. You owe nothing on the gains."],
          ["3","Qualified withdrawals are also tax-free","Pay for eligible medical expenses — now or in 30 years."],
        ].map(([n,t,d])=>(
          <div key={n} style={{display:"flex",gap:12,alignItems:"flex-start",marginBottom:n<"3"?12:0}}>
            <div style={{width:22,height:22,borderRadius:"50%",background:"rgba(251,191,36,0.2)",border:"1px solid rgba(251,191,36,0.4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"#fbbf24",flexShrink:0,marginTop:2}}>{n}</div>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:"#e2e8f0",marginBottom:3}}>{t}</div>
              <div style={{fontSize:12,color:"rgba(100,116,139,0.8)",lineHeight:1.6}}>{d}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{marginTop:14,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:"13px 15px"}}>
        <div style={{fontSize:12,color:"rgba(148,163,184,0.7)",lineHeight:1.7}}>No other account in the U.S. tax code offers all three of these benefits at once — not a 401(k), not a Roth IRA.</div>
      </div>
      <div style={{marginTop:10,background:"rgba(251,191,36,0.08)",border:"1px solid rgba(251,191,36,0.18)",borderRadius:14,padding:"13px 15px"}}>
        <div style={{fontSize:12,fontWeight:700,color:"#fbbf24",marginBottom:4}}>💡 Already had an HSA?</div>
        <div style={{fontSize:12,color:"rgba(148,163,184,0.75)",lineHeight:1.7}}>If you've ever had an HSA — even years ago — those funds are still yours and can be used at any time for qualified medical expenses that occurred after the account was opened. It's never too late to start tracking.</div>
      </div>
    </div>
  );
}

function SlideRule() {
  return (
    <div className="ob-in" style={{padding:"0 24px 32px"}}>
      <div style={{display:"flex",justifyContent:"center",marginBottom:24,marginTop:4}}>
        <div className="float-icon" style={{width:90,height:90,borderRadius:24,background:"radial-gradient(circle at 35% 35%,rgba(56,189,248,0.25),rgba(56,189,248,0.06))",border:"1px solid rgba(56,189,248,0.35)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:44,boxShadow:"0 0 36px rgba(56,189,248,0.35)"}}>⏳</div>
      </div>
      <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.18em",textTransform:"uppercase",color:"#38bdf8",marginBottom:10,textAlign:"center"}}>The Rule That Changes Everything</div>
      <div style={{fontFamily:"'DM Serif Display',serif",fontSize:26,lineHeight:1.3,color:"#f8fafc",textAlign:"center",marginBottom:16}}>
        There is no time limit on HSA reimbursement.
      </div>
      <div style={{fontSize:14,lineHeight:1.8,color:"rgba(148,163,184,0.85)",marginBottom:20}}>
        The IRS allows you to reimburse yourself for any qualified medical expense — no matter how old — as long as it occurred after your HSA was opened. A bill from 2019 can be claimed in 2045.
      </div>
      <div style={{background:"rgba(56,189,248,0.08)",border:"1px solid rgba(56,189,248,0.2)",borderRadius:16,padding:"18px",marginBottom:16}}>
        <div style={{fontSize:11,fontWeight:700,color:"rgba(56,189,248,0.7)",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:14}}>Example Timeline</div>
        {[
          {yr:"2020",event:"You open your HSA account",c:"#38bdf8",icon:"🏦"},
          {yr:"2021",event:"$800 dental bill — paid out of pocket, logged here",c:"#fbbf24",icon:"🦷"},
          {yr:"2024",event:"$1,200 surgery — paid out of pocket, logged here",c:"#f472b6",icon:"🏥"},
          {yr:"2045",event:"Retire — claim both expenses tax-free from HSA",c:"#34d399",icon:"🎉"},
        ].map((item,i,arr)=>(
          <div key={i} style={{display:"flex",gap:12,alignItems:"flex-start",marginBottom:i<arr.length-1?12:0}}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0}}>
              <div style={{width:32,height:32,borderRadius:10,background:`${item.c}18`,border:`1px solid ${item.c}35`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{item.icon}</div>
              {i<arr.length-1&&<div style={{width:1,height:16,background:`rgba(255,255,255,0.08)`,margin:"3px 0"}}/>}
            </div>
            <div style={{paddingTop:4}}>
              <div style={{fontSize:11,fontWeight:700,color:item.c,marginBottom:2}}>{item.yr}</div>
              <div style={{fontSize:12,color:"rgba(148,163,184,0.8)",lineHeight:1.5}}>{item.event}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {[
          {icon:"📅",c:"#38bdf8",t:"The expense must come after your HSA opened",d:"Any qualified expense incurred after your account opening date is fair game — forever."},
          {icon:"📄",c:"#fbbf24",t:"You must have documentation",d:"Keep every receipt, EOB, and invoice. Without proof, the IRS will disallow the reimbursement."},
          {icon:"💰",c:"#34d399",t:"The money can grow tax-free in the meantime",d:"While you wait to claim, your invested HSA balance compounds completely tax-free."},
        ].map((item,i)=>(
          <div key={i} className="glass" style={{borderRadius:14,padding:"13px 15px",display:"flex",gap:12,alignItems:"flex-start"}}>
            <div style={{width:34,height:34,borderRadius:10,background:`${item.c}18`,border:`1px solid ${item.c}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0}}>{item.icon}</div>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:"#e2e8f0",marginBottom:3}}>{item.t}</div>
              <div style={{fontSize:12,color:"rgba(100,116,139,0.8)",lineHeight:1.6}}>{item.d}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlideComparison() {
  const JOHN_FINAL = 682650;
  const milestones = [
    {yr:10,john:66139, taxed:Math.round(66139*0.73)},
    {yr:20,john:237691,taxed:Math.round(237691*0.73)},
    {yr:30,john:682650,taxed:Math.round(682650*0.73)},
  ];
  const fmtK = n => `$${Math.round(n/1000)}k`;
  return (
    <div className="ob-in" style={{padding:"0 24px 32px"}}>
      <div style={{display:"flex",justifyContent:"center",marginBottom:20,marginTop:4}}>
        <div className="float-icon" style={{width:90,height:90,borderRadius:24,background:"radial-gradient(circle at 35% 35%,rgba(52,211,153,0.25),rgba(52,211,153,0.06))",border:"1px solid rgba(52,211,153,0.35)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:44,boxShadow:"0 0 36px rgba(52,211,153,0.35)"}}>📈</div>
      </div>
      <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.18em",textTransform:"uppercase",color:"#34d399",marginBottom:10,textAlign:"center"}}>The Real Math</div>
      <div style={{fontFamily:"'DM Serif Display',serif",fontSize:24,lineHeight:1.3,color:"#f8fafc",textAlign:"center",marginBottom:6}}>
        Your receipts don't just organize expenses. They eliminate your tax bill.
      </div>
      <div style={{fontSize:12,color:"rgba(100,116,139,0.6)",textAlign:"center",marginBottom:16}}>
        $4,150/yr max HSA · 10% S&P 500 avg · 30 years · 27% tax bracket
      </div>
      {/* Stats banner */}
      <div style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:14,padding:"12px 16px",marginBottom:16,display:"flex",justifyContent:"space-around",textAlign:"center"}}>
        {[["$4,150","Max HSA / yr"],["10%","S&P 500 avg"],["30 yrs","Working years"]].map(([v,l],i)=>(
          <div key={i}>
            <div style={{fontSize:16,fontWeight:800,color:"#e2e8f0",fontFamily:"'Outfit',sans-serif"}}>{v}</div>
            <div style={{fontSize:10,color:"rgba(100,116,139,0.7)",marginTop:2,textTransform:"uppercase",letterSpacing:"0.05em"}}>{l}</div>
          </div>
        ))}
      </div>
      {/* How withdrawals work */}
      <div style={{background:"rgba(56,189,248,0.07)",border:"1px solid rgba(56,189,248,0.18)",borderRadius:16,padding:"14px 16px",marginBottom:14}}>
        <div style={{fontSize:11,fontWeight:700,color:"#38bdf8",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:10}}>How HSA withdrawals work at retirement</div>
        {[["📄","#34d399","With a logged receipt → 100% tax-free","Every dollar backed by a medical receipt comes out completely tax-free — no matter how much it grew."],
          ["🧾","#f87171","Without a receipt → taxed as income","Non-documented withdrawals after 65 are taxed like a traditional IRA. At 27%, that's a massive cut."]].map(([icon,c,t,d])=>(
          <div key={t} style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:10}}>
            <div style={{width:30,height:30,borderRadius:8,background:`${c}18`,border:`1px solid ${c}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>{icon}</div>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:c,marginBottom:2}}>{t}</div>
              <div style={{fontSize:12,color:"rgba(100,116,139,0.75)",lineHeight:1.5}}>{d}</div>
            </div>
          </div>
        ))}
      </div>
      {/* Jane */}
      <div className="glass" style={{borderRadius:18,padding:"16px",marginBottom:12,border:"1px solid rgba(248,113,113,0.2)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
          <div style={{width:42,height:42,borderRadius:13,background:"rgba(248,113,113,0.12)",border:"1px solid rgba(248,113,113,0.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>😔</div>
          <div>
            <div style={{fontSize:15,fontWeight:700,color:"#e2e8f0"}}>Jane — no receipts logged</div>
            <div style={{fontSize:11,color:"#f87171",fontWeight:600,marginTop:1}}>Swipes HSA card for every medical bill</div>
          </div>
        </div>
        <div style={{fontSize:13,color:"rgba(148,163,184,0.75)",lineHeight:1.65,marginBottom:12}}>
          Jane uses her HSA card directly. After 30 years she has <span style={{color:"#f87171",fontWeight:600}}>no receipts and no invested balance.</span> She's spent $124,500 and has nothing to show for it.
        </div>
        <div style={{display:"flex",gap:8}}>
          {[["$0","HSA balance"],["$0","Taxes saved"]].map(([v,l])=>(
            <div key={l} style={{flex:1,background:"rgba(248,113,113,0.07)",border:"1px solid rgba(248,113,113,0.15)",borderRadius:10,padding:"10px",textAlign:"center"}}>
              <div style={{fontSize:18,fontWeight:800,color:"#f87171",fontFamily:"'Outfit',sans-serif"}}>{v}</div>
              <div style={{fontSize:9,color:"rgba(100,116,139,0.6)",marginTop:2,textTransform:"uppercase",letterSpacing:"0.05em"}}>{l}</div>
            </div>
          ))}
        </div>
      </div>
      {/* John */}
      <div className="glass" style={{borderRadius:18,padding:"16px",marginBottom:14,border:"1px solid rgba(52,211,153,0.25)",background:"rgba(52,211,153,0.03)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
          <div style={{width:42,height:42,borderRadius:13,background:"rgba(52,211,153,0.15)",border:"1px solid rgba(52,211,153,0.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>😄</div>
          <div>
            <div style={{fontSize:15,fontWeight:700,color:"#e2e8f0"}}>John — every receipt logged</div>
            <div style={{fontSize:11,color:"#34d399",fontWeight:600,marginTop:1}}>Pays out of pocket, logs every bill here</div>
          </div>
        </div>
        <div style={{fontSize:13,color:"rgba(148,163,184,0.75)",lineHeight:1.65,marginBottom:12}}>
          John pays from his checking account and logs every receipt. His HSA grows fully invested at 10%/yr. His logged receipts are a <span style={{color:"#34d399",fontWeight:600}}>tax-free key</span> — every dollar he claims is sheltered from the IRS.
        </div>
        <div style={{display:"flex",gap:8,marginBottom:10}}>
          {[["$682,650","HSA balance"],["$184,316","Taxes saved"]].map(([v,l])=>(
            <div key={l} style={{flex:1,background:"rgba(52,211,153,0.08)",border:"1px solid rgba(52,211,153,0.2)",borderRadius:10,padding:"10px",textAlign:"center"}}>
              <div style={{fontSize:17,fontWeight:800,color:"#34d399",fontFamily:"'Outfit',sans-serif"}}>{v}</div>
              <div style={{fontSize:9,color:"rgba(100,116,139,0.6)",marginTop:2,textTransform:"uppercase",letterSpacing:"0.05em"}}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{height:7,borderRadius:4,background:"rgba(255,255,255,0.05)",overflow:"hidden"}}>
          <div style={{height:"100%",width:"100%",borderRadius:4,background:"linear-gradient(90deg,#059669,#34d399)",boxShadow:"0 0 10px rgba(52,211,153,0.45)",animation:"barFill 1.2s 0.5s cubic-bezier(0.34,1.2,0.64,1) both"}}/>
        </div>
      </div>
      {/* Milestones */}
      <div style={{background:"rgba(15,23,42,0.6)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:16,padding:"16px",marginBottom:14}}>
        <div style={{fontSize:11,fontWeight:700,color:"rgba(148,163,184,0.5)",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:4}}>John's HSA: receipts logged vs. not</div>
        <div style={{fontSize:11,color:"rgba(100,116,139,0.55)",marginBottom:14}}>Same balance — receipts determine your tax bill.</div>
        {milestones.map((m,i)=>(
          <div key={m.yr} style={{marginBottom:i<milestones.length-1?16:0}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <span style={{fontSize:11,color:"rgba(148,163,184,0.5)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>Year {m.yr}</span>
              <span style={{fontSize:13,fontWeight:800,color:"#e2e8f0",fontFamily:"'Outfit',sans-serif"}}>{fmtK(m.john)}</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
              <div style={{fontSize:10,color:"#34d399",fontWeight:600,width:72,flexShrink:0}}>📄 Logged</div>
              <div style={{flex:1,height:8,borderRadius:4,background:"rgba(255,255,255,0.04)",overflow:"hidden"}}>
                <div style={{height:"100%",borderRadius:4,width:`${(m.john/JOHN_FINAL)*100}%`,background:"linear-gradient(90deg,#059669,#34d399)",animation:`barFill 0.9s ${0.1+i*0.15}s ease both`}}/>
              </div>
              <div style={{fontSize:10,fontWeight:700,color:"#34d399",width:44,textAlign:"right",flexShrink:0}}>{fmtK(m.john)}</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{fontSize:10,color:"#f87171",fontWeight:600,width:72,flexShrink:0}}>🧾 No log</div>
              <div style={{flex:1,height:8,borderRadius:4,background:"rgba(255,255,255,0.04)",overflow:"hidden"}}>
                <div style={{height:"100%",borderRadius:4,width:`${(m.taxed/JOHN_FINAL)*100}%`,background:"linear-gradient(90deg,#991b1b,#f87171)",animation:`barFill 0.9s ${0.15+i*0.15}s ease both`}}/>
              </div>
              <div style={{fontSize:10,fontWeight:700,color:"#f87171",width:44,textAlign:"right",flexShrink:0}}>{fmtK(m.taxed)}</div>
            </div>
          </div>
        ))}
      </div>
      {/* Punchline */}
      <div style={{background:"linear-gradient(135deg,rgba(52,211,153,0.09),rgba(14,165,233,0.05))",border:"1px solid rgba(52,211,153,0.22)",borderRadius:16,padding:"18px"}}>
        <div style={{fontSize:28,fontWeight:900,color:"#34d399",fontFamily:"'Outfit',sans-serif",lineHeight:1,marginBottom:8}}>$184,316 saved in taxes.</div>
        <div style={{fontSize:13,color:"rgba(148,163,184,0.85)",lineHeight:1.75}}>
          John and Jane both have an HSA. Both invest in the S&P 500. The only difference is John kept his receipts.<br/><br/>
          <span style={{color:"#e2e8f0",fontWeight:600}}>Every receipt you log is a dollar the IRS can never touch.</span>
        </div>
      </div>
    </div>
  );
}

function SlideReceipts() {
  return (
    <div className="ob-in" style={{padding:"0 24px 32px"}}>
      <div style={{display:"flex",justifyContent:"center",marginBottom:24,marginTop:4}}>
        <div className="float-icon" style={{width:90,height:90,borderRadius:24,background:"radial-gradient(circle at 35% 35%,rgba(192,132,252,0.25),rgba(192,132,252,0.06))",border:"1px solid rgba(192,132,252,0.35)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:44,boxShadow:"0 0 36px rgba(192,132,252,0.35)"}}>🔐</div>
      </div>
      <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.18em",textTransform:"uppercase",color:"#c084fc",marginBottom:10,textAlign:"center"}}>Keep Your Proof</div>
      <div style={{fontFamily:"'DM Serif Display',serif",fontSize:26,lineHeight:1.3,color:"#f8fafc",textAlign:"center",marginBottom:16}}>
        Documentation is the only thing standing between you and your money.
      </div>
      <div style={{fontSize:14,lineHeight:1.8,color:"rgba(148,163,184,0.85)",textAlign:"center",marginBottom:22}}>
        The IRS requires you to substantiate every HSA reimbursement. No documentation means no reimbursement — even if the expense was completely legitimate.
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {[
          {icon:"📄",c:"#c084fc",t:"What counts as documentation",d:"Doctor bills, pharmacy receipts, EOBs, invoices — any record showing date, provider, amount, and medical purpose."},
          {icon:"📱",c:"#38bdf8",t:"How long to keep records",d:"Indefinitely. There is no statute of limitations when you self-reimburse. A 2024 receipt is valid in 2054."},
          {icon:"✅",c:"#34d399",t:"What HSA Vault does for you",d:"Logs each expense with date, amount, provider, and category, and lets you attach the receipt. Always organized. Always ready."},
        ].map((item,i)=>(
          <div key={i} className="glass" style={{borderRadius:14,padding:"14px 16px",display:"flex",gap:12,alignItems:"flex-start"}}>
            <div style={{width:36,height:36,borderRadius:10,background:`${item.c}18`,border:`1px solid ${item.c}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{item.icon}</div>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"#e2e8f0",marginBottom:3}}>{item.t}</div>
              <div style={{fontSize:12,color:"rgba(100,116,139,0.8)",lineHeight:1.6}}>{item.d}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlideTutorial() {
  return (
    <div className="ob-in" style={{padding:"0 24px 32px"}}>
      <div style={{display:"flex",justifyContent:"center",marginBottom:24,marginTop:4}}>
        <div className="float-icon" style={{width:90,height:90,borderRadius:24,background:"radial-gradient(circle at 35% 35%,rgba(56,189,248,0.25),rgba(56,189,248,0.06))",border:"1px solid rgba(56,189,248,0.35)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:44,boxShadow:"0 0 36px rgba(56,189,248,0.35)"}}>✦</div>
      </div>
      <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.18em",textTransform:"uppercase",color:"#38bdf8",marginBottom:10,textAlign:"center"}}>Using HSA Vault</div>
      <div style={{fontFamily:"'DM Serif Display',serif",fontSize:26,lineHeight:1.3,color:"#f8fafc",textAlign:"center",marginBottom:16}}>
        Three steps. Less than a minute per expense.
      </div>
      <div style={{fontSize:14,lineHeight:1.8,color:"rgba(148,163,184,0.85)",textAlign:"center",marginBottom:24}}>
        The habit is simple. Log it right after paying. Attach the receipt while you have it. The payoff comes at retirement.
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {[
          {icon:"➕",c:"#38bdf8",t:"Log every expense",d:"Tap + after any medical expense. Enter date, provider, amount, and category."},
          {icon:"📎",c:"#fbbf24",t:"Attach your receipt",d:"Upload the PDF, photo, or EOB. Stored with your record forever."},
          {icon:"✓", c:"#34d399",t:"Mark when reimbursed",d:"At retirement, tap the circle when you pull money from your HSA to cover it."},
        ].map((s,i)=>(
          <div key={i} className="glass" style={{borderRadius:16,padding:"16px",display:"flex",alignItems:"center",gap:14}}>
            <div style={{width:44,height:44,borderRadius:13,background:`${s.c}18`,border:`1px solid ${s.c}35`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0,boxShadow:`0 0 14px ${s.c}30`}}>{s.icon}</div>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:"#e2e8f0",marginBottom:3}}>{s.t}</div>
              <div style={{fontSize:12,color:"rgba(100,116,139,0.8)",lineHeight:1.6}}>{s.d}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{marginTop:20,background:"linear-gradient(135deg,rgba(52,211,153,0.08),rgba(14,165,233,0.05))",border:"1px solid rgba(52,211,153,0.18)",borderRadius:14,padding:"14px 16px",textAlign:"center"}}>
        <div style={{fontSize:13,color:"rgba(148,163,184,0.8)",lineHeight:1.7}}>Every expense you log today is a tax-free dollar waiting for you in retirement. <span style={{color:"#34d399",fontWeight:600}}>Start with your most recent medical bill.</span></div>
      </div>
    </div>
  );
}

const SLIDES      = [SlideWhat,SlideRule,SlideComparison,SlideReceipts,SlideTutorial];
const ACCENTS     = ["#fbbf24","#38bdf8","#34d399","#c084fc","#38bdf8"];

function Onboarding({onDone}) {
  const [slide,setSlide] = useState(0);
  const total  = SLIDES.length;
  const isLast = slide===total-1;
  const accent = ACCENTS[slide];
  const touchStart = useRef(null);

  const onTouchStart = e => { touchStart.current={x:e.touches[0].clientX,y:e.touches[0].clientY}; };
  const onTouchEnd   = e => {
    if(!touchStart.current) return;
    const dx=e.changedTouches[0].clientX-touchStart.current.x;
    const dy=e.changedTouches[0].clientY-touchStart.current.y;
    touchStart.current=null;
    if(Math.abs(dx)<Math.abs(dy)||Math.abs(dx)<50) return;
    if(dx<0&&slide<total-1) setSlide(s=>s+1);
    if(dx>0&&slide>0)       setSlide(s=>s-1);
  };

  const Slide = SLIDES[slide];
  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} style={{position:"fixed",inset:0,zIndex:200,display:"flex",flexDirection:"column",fontFamily:"'Outfit',sans-serif"}}>
      <BG/>
      {/* Header */}
      <div style={{position:"relative",zIndex:1,flexShrink:0,padding:"16px 20px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:11,fontWeight:700,color:accent,letterSpacing:"0.1em",textTransform:"uppercase",opacity:0.8}}>{slide+1} / {total}</div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          {SLIDES.map((_,i)=>(
            <button key={i} onClick={()=>setSlide(i)} style={{width:i===slide?22:6,height:6,borderRadius:3,border:"none",cursor:"pointer",background:i===slide?ACCENTS[i]:"rgba(255,255,255,0.15)",transition:"all 0.3s cubic-bezier(0.34,1.56,0.64,1)",boxShadow:i===slide?`0 0 8px ${ACCENTS[i]}80`:"none",padding:0}}/>
          ))}
        </div>
        <button onClick={onDone} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:20,padding:"6px 14px",color:"rgba(148,163,184,0.6)",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>Skip</button>
      </div>
      {/* Scrollable content */}
      <div style={{flex:1,position:"relative",zIndex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",scrollbarWidth:"none"}}>
        <div style={{paddingBottom:130}}><Slide key={slide}/></div>
      </div>
      {/* Bottom CTA */}
      <div style={{position:"relative",zIndex:2,flexShrink:0,padding:"14px 24px 48px",background:"linear-gradient(to top,rgba(2,5,9,1) 70%,transparent 100%)"}}>
        <button onClick={()=>{if(isLast){onDone();}else setSlide(s=>s+1);}} className="glow-btn" style={{width:"100%",padding:"17px",border:"none",borderRadius:18,cursor:"pointer",background:isLast?"linear-gradient(135deg,#059669,#34d399)":`linear-gradient(135deg,${accent}bb,${accent})`,color:"#fff",fontSize:16,fontWeight:700,fontFamily:"'Outfit',sans-serif",letterSpacing:"0.04em",boxShadow:isLast?"0 0 28px rgba(52,211,153,0.5),inset 0 1px 0 rgba(255,255,255,0.2)":`0 0 28px ${accent}50,inset 0 1px 0 rgba(255,255,255,0.2)`,transition:"all 0.35s"}}>
          {isLast?"Start Tracking My Expenses →":"Continue →"}
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN APP COMPONENTS
══════════════════════════════════════════════════════════════════ */
function ReimburseToggle({reimbursed,onToggle}) {
  return (
    <button onClick={onToggle} className="chk" style={{width:32,height:32,borderRadius:"50%",border:"none",cursor:"pointer",flexShrink:0,background:reimbursed?"linear-gradient(135deg,#059669,#34d399)":"rgba(255,255,255,0.06)",boxShadow:reimbursed?"0 0 16px rgba(52,211,153,0.5),inset 0 1px 0 rgba(255,255,255,0.2)":"inset 0 0 0 1.5px rgba(255,255,255,0.12)",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.25s"}}>
      {reimbursed
        ? <svg style={{animation:"checkPop 0.3s cubic-bezier(0.34,1.56,0.64,1) both"}} width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7.5L5.5 10.5L11.5 4" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        : <div style={{width:10,height:10,borderRadius:"50%",border:"1.5px solid rgba(148,163,184,0.4)"}}/>
      }
    </button>
  );
}

function HeroCard({expenses,year}) {
  const f=year==="all"?expenses:expenses.filter(e=>new Date(e.date+"T00:00:00").getFullYear()===year);
  const total=f.reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
  const reimb=f.filter(e=>e.reimbursed).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
  const pct=total>0?(reimb/total)*100:0;
  return (
    <div className="fu" style={{marginBottom:20,borderRadius:24,overflow:"hidden",position:"relative"}}>
      <div style={{position:"absolute",inset:0,borderRadius:24,padding:1,background:"linear-gradient(135deg,rgba(56,189,248,0.4),rgba(139,92,246,0.2),rgba(52,211,153,0.3))",zIndex:0}}>
        <div style={{width:"100%",height:"100%",borderRadius:23,background:"#080f1e"}}/>
      </div>
      <div className="glass" style={{position:"relative",zIndex:1,borderRadius:24,border:"none",padding:"24px 20px 20px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
          <div>
            <div style={{fontSize:11,fontWeight:600,letterSpacing:"0.12em",textTransform:"uppercase",color:"rgba(56,189,248,0.7)",marginBottom:6}}>Total Tracked</div>
            <div style={{fontFamily:"'DM Serif Display',serif",fontSize:38,fontWeight:400,color:"#f8fafc",lineHeight:1}} className="shimmer-text">{fmt(total)}</div>
            <div style={{fontSize:12,color:"rgba(148,163,184,0.6)",marginTop:6}}>{f.length} expense{f.length!==1?"s":""} · {year==="all"?"all time":year}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:11,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:"rgba(148,163,184,0.5)",marginBottom:4}}>Progress</div>
            <div style={{fontSize:28,fontWeight:800,color:pct>=100?"#34d399":"#38bdf8",fontFamily:"'Outfit',sans-serif"}}>{Math.round(pct)}<span style={{fontSize:16,fontWeight:400}}>%</span></div>
          </div>
        </div>
        <div style={{marginBottom:20}}>
          <div style={{height:6,borderRadius:3,background:"rgba(255,255,255,0.06)",overflow:"hidden"}}>
            <div style={{height:"100%",borderRadius:3,width:`${pct}%`,background:pct>=100?"linear-gradient(90deg,#059669,#34d399)":"linear-gradient(90deg,#0ea5e9,#38bdf8 60%,#34d399)",boxShadow:pct>0?"0 0 12px rgba(56,189,248,0.6)":"none",transition:"width 0.8s cubic-bezier(0.34,1.2,0.64,1)",animation:"barFill 1s cubic-bezier(0.34,1.2,0.64,1) both"}}/>
          </div>
          {pct>=100&&total>0&&<div style={{fontSize:11,color:"#34d399",marginTop:6,fontWeight:600}}>✦ All expenses reimbursed</div>}
        </div>
        <div style={{display:"flex",gap:10}}>
          <div style={{flex:1,background:"rgba(52,211,153,0.08)",border:"1px solid rgba(52,211,153,0.2)",borderRadius:14,padding:"12px 14px"}}>
            <div style={{fontSize:11,color:"rgba(52,211,153,0.7)",fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:4}}>Reimbursed</div>
            <div style={{fontSize:20,fontWeight:700,color:"#34d399",fontFamily:"'Outfit',sans-serif"}}>{fmt(reimb)}</div>
          </div>
          <div style={{flex:1,background:"rgba(251,191,36,0.07)",border:"1px solid rgba(251,191,36,0.18)",borderRadius:14,padding:"12px 14px"}}>
            <div style={{fontSize:11,color:"rgba(251,191,36,0.7)",fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:4}}>Pending</div>
            <div style={{fontSize:20,fontWeight:700,color:"#fbbf24",fontFamily:"'Outfit',sans-serif"}}>{fmt(total-reimb)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PieChart({expenses,year}) {
  const [hovered,setHovered]=useState(null);
  const [mode,setMode]=useState("all");

  const base=year==="all"?expenses:expenses.filter(e=>new Date(e.date+"T00:00:00").getFullYear()===year);
  const f=mode==="all"?base:mode==="reimbursed"?base.filter(e=>e.reimbursed):base.filter(e=>!e.reimbursed);
  const totals={};
  f.forEach(e=>{totals[e.category]=(totals[e.category]||0)+(parseFloat(e.amount)||0);});
  const sorted=Object.entries(totals).sort((a,b)=>b[1]-a[1]);
  const total=sorted.reduce((s,[,v])=>s+v,0);

  const R=70,cx=90,cy=90,stroke=28,circ=2*Math.PI*R;
  let off=0;
  const slices=sorted.map(([cat,amt])=>{
    const dash=(amt/total)*circ;
    const s={cat,amt,dash,off};
    off+=dash;
    return s;
  });

  const active=hovered??(sorted[0]?.[0]||null);
  const activeAmt=totals[active]||0;
  const activePct=total>0?Math.round((activeAmt/total)*100):0;

  return (
    <div className="glass fu2" style={{borderRadius:20,padding:"20px",marginBottom:16,border:"1px solid rgba(255,255,255,0.06)"}}>
      {/* Header + mode toggle */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:"rgba(148,163,184,0.5)"}}>Breakdown</div>
        <div style={{display:"flex",gap:3,background:"rgba(255,255,255,0.05)",borderRadius:20,padding:3}}>
          {[["all","All","#38bdf8"],["reimbursed","✓ Done","#34d399"],["pending","Pending","#fbbf24"]].map(([m,label,c])=>(
            <button key={m} onClick={()=>{setMode(m);setHovered(null);}} style={{
              padding:"4px 10px",borderRadius:16,border:"none",cursor:"pointer",
              background:mode===m?`${c}25`:"transparent",
              color:mode===m?c:"rgba(100,116,139,0.6)",
              fontSize:10,fontWeight:700,fontFamily:"'Outfit',sans-serif",
              transition:"all 0.2s",whiteSpace:"nowrap",
            }}>{label}</button>
          ))}
        </div>
      </div>

      {!sorted.length?(
        <div style={{textAlign:"center",padding:"28px 0",color:"rgba(100,116,139,0.5)",fontSize:13}}>
          No {mode==="reimbursed"?"reimbursed":mode==="pending"?"pending":""} expenses{year!=="all"?` in ${year}`:""}
        </div>
      ):(
        <div style={{display:"flex",gap:16,alignItems:"center"}}>
          {/* Donut */}
          <div style={{flexShrink:0,position:"relative",width:180,height:180}}>
            <svg width="180" height="180" style={{transform:"rotate(-90deg)"}}>
              {slices.map(({cat,dash,off:o})=>{
                const isAct=cat===active;
                const color=CAT_COLORS[cat]||"#94a3b8";
                return (
                  <circle key={cat} cx={cx} cy={cy} r={R}
                    fill="none" stroke={color}
                    strokeWidth={isAct?stroke+6:stroke-4}
                    strokeDasharray={`${dash} ${circ-dash}`}
                    strokeDashoffset={-o}
                    opacity={isAct?1:0.22}
                    style={{transition:"all 0.25s",cursor:"pointer",filter:isAct?`drop-shadow(0 0 8px ${color}) drop-shadow(0 0 18px ${color}88)`:"none"}}
                    onMouseEnter={()=>setHovered(cat)}
                    onMouseLeave={()=>setHovered(null)}
                    onTouchStart={()=>setHovered(h=>h===cat?null:cat)}
                  />
                );
              })}
            </svg>
            <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
              <div style={{fontSize:10,fontWeight:700,color:CAT_COLORS[active]||"#94a3b8",textTransform:"uppercase",marginBottom:2,textAlign:"center",maxWidth:70,lineHeight:1.3}}>{CAT_ICONS[active]} {active?.split(" ")[0]}</div>
              <div style={{fontSize:18,fontWeight:800,color:"#f8fafc",fontFamily:"'Outfit',sans-serif",lineHeight:1}}>{activePct}%</div>
              <div style={{fontSize:11,color:"rgba(148,163,184,0.6)",marginTop:2}}>{fmt(activeAmt)}</div>
            </div>
          </div>
          {/* Legend */}
          <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",gap:8}}>
            {sorted.slice(0,6).map(([cat,amt])=>{
              const isAct=active===cat;
              const color=CAT_COLORS[cat]||"#94a3b8";
              return (
                <div key={cat}
                  onMouseEnter={()=>setHovered(cat)}
                  onMouseLeave={()=>setHovered(null)}
                  onTouchStart={()=>setHovered(h=>h===cat?null:cat)}
                  style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",opacity:isAct?1:0.4,transition:"opacity 0.25s"}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:color,flexShrink:0,boxShadow:isAct?`0 0 8px ${color},0 0 14px ${color}88`:""}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:11,fontWeight:isAct?700:500,color:isAct?color:"rgba(226,232,240,0.85)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",transition:"color 0.2s"}}>{cat}</div>
                    <div style={{fontSize:10,color:"rgba(100,116,139,0.7)",fontFamily:"'Outfit',sans-serif"}}>{fmt(amt)} · {Math.round((amt/total)*100)}%</div>
                  </div>
                </div>
              );
            })}
            {sorted.length>6&&<div style={{fontSize:10,color:"rgba(100,116,139,0.5)",paddingLeft:16}}>+{sorted.length-6} more</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function YearTabs({year,setYear}) {
  return (
    <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:4,marginBottom:18,scrollbarWidth:"none"}}>
      {["all",...YEARS].map(y=>(
        <button key={y} onClick={()=>setYear(y)} style={{padding:"6px 14px",borderRadius:20,border:`1px solid ${year===y?"rgba(56,189,248,0.5)":"rgba(255,255,255,0.06)"}`,background:year===y?"rgba(56,189,248,0.12)":"rgba(15,23,42,0.4)",color:year===y?"#38bdf8":"rgba(100,116,139,0.8)",fontSize:12,fontWeight:600,fontFamily:"'Outfit',sans-serif",whiteSpace:"nowrap",letterSpacing:"0.03em",boxShadow:year===y?"0 0 12px rgba(56,189,248,0.2)":"none",cursor:"pointer",transition:"all 0.2s",backdropFilter:"blur(8px)"}}>
          {y==="all"?"All Time":y}
        </button>
      ))}
    </div>
  );
}

/* ── Shared form for Add + Edit ──────────────────────────────────────────── */
function ExpenseForm({initial, onSave, onClose, title, subtitle, saveLabel}) {
  const [form,setForm]=useState(initial);
  const [saving,setSaving]=useState(false);
  const [catOpen,setCatOpen]=useState(false);
  const [subOpen,setSubOpen]=useState(false);
  const fileRef=useRef();
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const subItems=ELIGIBLE[form.category]||[];
  const selColor=CAT_COLORS[form.category]||"#94a3b8";
  const handleSubmit=async()=>{
    if(!form.amount||!form.provider||!form.date) return alert("Please fill in Date, Provider, and Amount.");
    setSaving(true);
    await new Promise(r=>setTimeout(r,350));
    onSave({...form,amount:parseFloat(form.amount)});
  };
  const inp={width:"100%",background:"rgba(15,23,42,0.6)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,color:"#e2e8f0",fontSize:14,padding:"12px 14px",outline:"none",fontFamily:"'Outfit',sans-serif",boxSizing:"border-box",marginBottom:14};
  const lbl={fontSize:10,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:"rgba(100,116,139,0.8)",marginBottom:6,display:"block"};
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(2,5,9,0.82)",zIndex:300,display:"flex",alignItems:"flex-end",justifyContent:"center",backdropFilter:"blur(8px)"}} onClick={onClose}>
      <div className="slide-in" style={{background:"linear-gradient(180deg,#0d1829 0%,#080f1e 100%)",borderRadius:"24px 24px 0 0",width:"100%",maxWidth:480,maxHeight:"94vh",overflowY:"auto",padding:"24px 20px 52px",border:"1px solid rgba(56,189,248,0.15)",borderBottom:"none",boxShadow:"0 -20px 60px rgba(0,0,0,0.85)"}} onClick={e=>e.stopPropagation()}>
        <div style={{width:36,height:4,borderRadius:2,background:"rgba(255,255,255,0.15)",margin:"0 auto 20px"}}/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
          <div>
            <div style={{fontFamily:"'DM Serif Display',serif",fontSize:22,color:"#f8fafc"}}>{title}</div>
            <div style={{fontSize:11,color:"rgba(100,116,139,0.7)",marginTop:2}}>{subtitle}</div>
          </div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"50%",width:32,height:32,color:"rgba(148,163,184,0.7)",cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
        </div>

        <label style={lbl}>Date of Expense *</label>
        <input style={inp} type="date" value={form.date} onChange={e=>set("date",e.target.value)}/>

        <label style={lbl}>Patient Name *</label>
        <input style={inp} type="text" placeholder="e.g. John, Sarah, Mom…" value={form.patient||""} onChange={e=>set("patient",e.target.value)}/>

        <label style={lbl}>Provider / Facility *</label>
        <input style={inp} type="text" placeholder="Dr. Smith, CVS Pharmacy…" value={form.provider} onChange={e=>set("provider",e.target.value)}/>

        <label style={lbl}>Amount *</label>
        <div style={{position:"relative",marginBottom:14}}>
          <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:"rgba(148,163,184,0.5)",fontSize:14}}>$</span>
          <input style={{...inp,paddingLeft:28,marginBottom:0}} type="number" placeholder="0.00" value={form.amount} onChange={e=>set("amount",e.target.value)}/>
        </div>

        {/* Category */}
        <label style={lbl}>Category</label>
        <button onClick={()=>{setCatOpen(v=>!v);setSubOpen(false);}} style={{width:"100%",background:"rgba(15,23,42,0.6)",border:`1px solid ${catOpen?selColor+"60":"rgba(255,255,255,0.08)"}`,borderRadius:12,color:"#e2e8f0",fontSize:14,padding:"12px 14px",fontFamily:"'Outfit',sans-serif",boxSizing:"border-box",marginBottom:catOpen?6:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",transition:"border 0.2s"}}>
          <span style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{width:28,height:28,borderRadius:8,background:`${selColor}20`,border:`1px solid ${selColor}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{CAT_ICONS[form.category]||"📋"}</span>
            <span style={{fontWeight:600}}>{form.category}</span>
          </span>
          <span style={{color:"rgba(100,116,139,0.5)",fontSize:12,display:"inline-block",transform:catOpen?"rotate(180deg)":"rotate(0deg)",transition:"transform 0.2s"}}>⌄</span>
        </button>
        {catOpen&&(
          <div style={{background:"rgba(8,12,20,0.97)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:14,marginBottom:14,overflow:"hidden"}}>
            {CATEGORIES.map((cat,i)=>{
              const c=CAT_COLORS[cat]||"#94a3b8";
              const isSel=form.category===cat;
              return (
                <button key={cat} onClick={()=>{set("category",cat);set("subcategory","");setCatOpen(false);}} style={{width:"100%",background:isSel?`${c}12`:"transparent",border:"none",borderBottom:i<CATEGORIES.length-1?"1px solid rgba(255,255,255,0.04)":"none",padding:"11px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:10,transition:"background 0.15s"}}>
                  <span style={{width:32,height:32,borderRadius:9,background:`${c}18`,border:`1px solid ${isSel?c+"50":c+"20"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0}}>{CAT_ICONS[cat]||"📋"}</span>
                  <span style={{fontSize:13,fontWeight:isSel?700:500,color:isSel?c:"rgba(200,212,228,0.85)",fontFamily:"'Outfit',sans-serif",textAlign:"left"}}>{cat}</span>
                  {isSel&&<span style={{marginLeft:"auto",color:c,fontSize:16}}>✓</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* Subcategory */}
        {subItems.length>0&&(
          <>
            <label style={lbl}>Expense Type <span style={{color:"rgba(100,116,139,0.45)",fontWeight:400,textTransform:"none",letterSpacing:0,fontSize:9}}>(optional)</span></label>
            <button onClick={()=>setSubOpen(v=>!v)} style={{width:"100%",background:"rgba(15,23,42,0.6)",border:`1px solid ${subOpen?selColor+"40":"rgba(255,255,255,0.06)"}`,borderRadius:12,color:form.subcategory?"#e2e8f0":"rgba(100,116,139,0.5)",fontSize:14,padding:"12px 14px",fontFamily:"'Outfit',sans-serif",boxSizing:"border-box",marginBottom:subOpen?6:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",transition:"border 0.2s"}}>
              <span style={{fontWeight:form.subcategory?600:400}}>{form.subcategory||`e.g. ${subItems[0]?.n}…`}</span>
              <span style={{color:"rgba(100,116,139,0.4)",fontSize:12,display:"inline-block",transform:subOpen?"rotate(180deg)":"rotate(0deg)",transition:"transform 0.2s"}}>⌄</span>
            </button>
            {subOpen&&(
              <div style={{background:"rgba(8,12,20,0.97)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,marginBottom:14,overflow:"hidden",maxHeight:240,overflowY:"auto"}}>
                <button onClick={()=>{set("subcategory","");setSubOpen(false);}} style={{width:"100%",background:"transparent",border:"none",borderBottom:"1px solid rgba(255,255,255,0.05)",padding:"10px 14px",cursor:"pointer",color:"rgba(100,116,139,0.5)",fontSize:12,fontFamily:"'Outfit',sans-serif",fontStyle:"italic",textAlign:"left"}}>None / Other</button>
                {subItems.map((item,i)=>{
                  const isSel=form.subcategory===item.n;
                  return (
                    <button key={i} onClick={()=>{set("subcategory",item.n);setSubOpen(false);}} style={{width:"100%",background:isSel?`${selColor}12`:"transparent",border:"none",borderBottom:i<subItems.length-1?"1px solid rgba(255,255,255,0.04)":"none",padding:"11px 14px",cursor:"pointer",textAlign:"left",transition:"background 0.15s"}}>
                      <div style={{fontSize:13,fontWeight:isSel?700:500,color:isSel?selColor:"rgba(200,212,228,0.85)",fontFamily:"'Outfit',sans-serif",marginBottom:2}}>{item.n}{isSel&&" ✓"}</div>
                      <div style={{fontSize:11,color:"rgba(100,116,139,0.6)",lineHeight:1.4}}>{item.d}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        <label style={lbl}>Payment Type</label>
        <select style={inp} value={form.paymentType} onChange={e=>set("paymentType",e.target.value)}>{PAYMENT_TYPES.map(p=><option key={p}>{p}</option>)}</select>

        <label style={lbl}>Notes</label>
        <input style={inp} type="text" placeholder="Annual checkup, copay, etc." value={form.notes} onChange={e=>set("notes",e.target.value)}/>

        <label style={lbl}>Receipt / Document</label>
        <div onClick={()=>fileRef.current.click()} style={{border:"1px dashed rgba(56,189,248,0.25)",borderRadius:14,padding:"16px",textAlign:"center",cursor:"pointer",marginBottom:16,background:"rgba(56,189,248,0.04)"}}>
          {form.fileName
            ?<><div style={{fontSize:22}}>📎</div><div style={{color:"#38bdf8",fontSize:12,marginTop:6,fontWeight:500}}>{form.fileName}</div><div style={{fontSize:10,color:"rgba(100,116,139,0.5)",marginTop:3}}>Tap to replace</div></>
            :<><div style={{fontSize:26}}>📄</div><div style={{color:"rgba(100,116,139,0.6)",fontSize:12,marginTop:6}}>Tap to attach PDF or image</div></>
          }
        </div>
        <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.heic,.doc,.docx" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(f)set("fileName",f.name);}}/>

        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(52,211,153,0.06)",border:"1px solid rgba(52,211,153,0.15)",borderRadius:14,padding:"14px 16px",marginBottom:24}}>
          <div>
            <div style={{fontSize:14,color:"#e2e8f0",fontWeight:600}}>Already Reimbursed?</div>
            <div style={{fontSize:11,color:"rgba(100,116,139,0.7)",marginTop:2}}>Mark if already claimed from HSA</div>
          </div>
          <button onClick={()=>set("reimbursed",!form.reimbursed)} style={{width:48,height:26,borderRadius:13,border:"none",cursor:"pointer",position:"relative",background:form.reimbursed?"linear-gradient(135deg,#059669,#34d399)":"rgba(255,255,255,0.08)",boxShadow:form.reimbursed?"0 0 12px rgba(52,211,153,0.4)":"none",transition:"all 0.25s",flexShrink:0}}>
            <div style={{width:20,height:20,borderRadius:"50%",background:"#fff",position:"absolute",top:3,left:form.reimbursed?24:3,transition:"left 0.25s",boxShadow:"0 2px 6px rgba(0,0,0,0.4)"}}/>
          </button>
        </div>

        <button className="glow-btn" onClick={handleSubmit} disabled={saving} style={{width:"100%",padding:"16px",border:"none",borderRadius:16,cursor:"pointer",background:saving?"rgba(255,255,255,0.1)":"linear-gradient(135deg,#0ea5e9,#2563eb)",color:"#fff",fontSize:15,fontWeight:700,fontFamily:"'Outfit',sans-serif",letterSpacing:"0.04em",boxShadow:saving?"none":"0 0 24px rgba(14,165,233,0.4),inset 0 1px 0 rgba(255,255,255,0.15)",transition:"all 0.25s"}}>
          {saving?"Saving…":saveLabel}
        </button>
      </div>
    </div>
  );
}

function AddModal({onClose,onSave}) {
  const blank={date:new Date().toISOString().slice(0,10),amount:"",patient:"",provider:"",category:"Doctor & Hospital",subcategory:"",paymentType:"Credit Card",notes:"",fileName:"",reimbursed:false};
  return <ExpenseForm initial={blank} onSave={e=>{onSave({...e,id:uid()});}} onClose={onClose} title="Log Expense" subtitle="Add a medical expense to your vault" saveLabel="Save Expense"/>;
}

function EditModal({expense,onClose,onSave}) {
  return <ExpenseForm initial={{...expense}} onSave={onSave} onClose={onClose} title="Edit Expense" subtitle="Update this expense record" saveLabel="Save Changes"/>;
}

/* ── Expense Row with edit + receipt view ─────────────────────────────────── */
function ExpRow({expense,onDelete,onToggle,onEdit,delay=0}) {
  const [showDetail,setShowDetail]=useState(false);
  const color=CAT_COLORS[expense.category]||"#94a3b8";
  return (
    <>
      <div className="exp-row fu" style={{animationDelay:`${delay}s`,display:"flex",alignItems:"flex-start",gap:12,opacity:expense.reimbursed?0.65:1,transition:"opacity 0.3s"}}>
        <ReimburseToggle reimbursed={expense.reimbursed} onToggle={()=>onToggle(expense.id)}/>
        <div style={{width:40,height:40,borderRadius:12,background:`${color}18`,border:`1px solid ${color}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{CAT_ICONS[expense.category]||"📋"}</div>
        <div style={{flex:1,minWidth:0,cursor:"pointer"}} onClick={()=>setShowDetail(true)}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div style={{fontWeight:600,fontSize:14,color:expense.reimbursed?"rgba(226,232,240,0.5)":"#e2e8f0",textDecoration:expense.reimbursed?"line-through":"none",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:155,marginBottom:4}}>{expense.provider||"Unknown"}</div>
            <div style={{fontWeight:700,fontSize:15,color:expense.reimbursed?"#34d399":"#f8fafc",flexShrink:0,marginLeft:8,fontFamily:"'Outfit',sans-serif"}}>{fmt(expense.amount)}</div>
          </div>
          <div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}>
            <span style={{fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:20,background:`${color}18`,color,border:`1px solid ${color}30`}}>{expense.category}</span>
            {expense.subcategory&&<span style={{fontSize:10,padding:"2px 8px",borderRadius:20,background:"rgba(255,255,255,0.05)",color:"rgba(148,163,184,0.7)",border:"1px solid rgba(255,255,255,0.06)"}}>{expense.subcategory}</span>}
            {expense.reimbursed
              ?<span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:"rgba(52,211,153,0.12)",color:"#34d399",border:"1px solid rgba(52,211,153,0.25)"}}>✓ Done</span>
              :<span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:"rgba(251,191,36,0.1)",color:"#fbbf24",border:"1px solid rgba(251,191,36,0.2)"}}>Pending</span>
            }
            <span style={{fontSize:11,color:"rgba(100,116,139,0.8)",marginLeft:"auto"}}>{fmtDate(expense.date)}</span>
          </div>
          {expense.notes&&<div style={{fontSize:11,color:"rgba(100,116,139,0.7)",marginTop:5,fontStyle:"italic"}}>{expense.notes}</div>}
          {expense.fileName&&<div style={{fontSize:11,color:"#38bdf8",marginTop:4}}>📎 {expense.fileName}</div>}
        </div>
        {/* Action buttons */}
        <div style={{display:"flex",flexDirection:"column",gap:4,flexShrink:0}}>
          <button onClick={()=>onEdit(expense)} style={{background:"none",border:"none",color:"rgba(56,189,248,0.4)",cursor:"pointer",fontSize:14,lineHeight:1,padding:"2px 4px",transition:"color 0.2s"}} onMouseEnter={e=>e.target.style.color="#38bdf8"} onMouseLeave={e=>e.target.style.color="rgba(56,189,248,0.4)"} title="Edit">✎</button>
          <button onClick={()=>onDelete(expense.id)} style={{background:"none",border:"none",color:"rgba(248,113,113,0.3)",cursor:"pointer",fontSize:16,lineHeight:1,padding:"2px 4px",transition:"color 0.2s"}} onMouseEnter={e=>e.target.style.color="rgba(248,113,113,0.8)"} onMouseLeave={e=>e.target.style.color="rgba(248,113,113,0.3)"} title="Delete">×</button>
        </div>
      </div>

      {/* Detail / Receipt modal */}
      {showDetail&&(
        <div style={{position:"fixed",inset:0,background:"rgba(2,5,9,0.85)",zIndex:400,display:"flex",alignItems:"flex-end",justifyContent:"center",backdropFilter:"blur(8px)"}} onClick={()=>setShowDetail(false)}>
          <div className="slide-in" style={{background:"linear-gradient(180deg,#0d1829,#080f1e)",borderRadius:"24px 24px 0 0",width:"100%",maxWidth:480,maxHeight:"80vh",overflowY:"auto",padding:"24px 20px 44px",border:"1px solid rgba(56,189,248,0.15)",borderBottom:"none",boxShadow:"0 -20px 60px rgba(0,0,0,0.9)"}} onClick={e=>e.stopPropagation()}>
            <div style={{width:36,height:4,borderRadius:2,background:"rgba(255,255,255,0.15)",margin:"0 auto 20px"}}/>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
              <div>
                <div style={{fontFamily:"'DM Serif Display',serif",fontSize:20,color:"#f8fafc",marginBottom:2}}>{expense.provider}</div>
                <div style={{fontSize:12,color:"rgba(100,116,139,0.6)"}}>{fmtDate(expense.date)}{expense.patient?` · ${expense.patient}`:""}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontFamily:"'Outfit',sans-serif",fontSize:26,fontWeight:800,color:expense.reimbursed?"#34d399":"#f8fafc"}}>{fmt(expense.amount)}</div>
                <div style={{fontSize:10,color:expense.reimbursed?"#34d399":"#fbbf24",fontWeight:700,marginTop:2}}>{expense.reimbursed?"✓ Reimbursed":"Pending"}</div>
              </div>
            </div>

            {/* Details grid */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
              {[
                ["Category",expense.category],
                ["Payment",expense.paymentType],
                expense.subcategory?["Type",expense.subcategory]:null,
                expense.paymentType?["Status",expense.reimbursed?"Reimbursed":"Pending"]:null,
              ].filter(Boolean).map(([label,val])=>(
                <div key={label} style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:"10px 12px"}}>
                  <div style={{fontSize:10,color:"rgba(100,116,139,0.6)",textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:700,marginBottom:4}}>{label}</div>
                  <div style={{fontSize:13,fontWeight:600,color:"#e2e8f0"}}>{val}</div>
                </div>
              ))}
            </div>

            {expense.notes&&(
              <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:12,padding:"12px 14px",marginBottom:14}}>
                <div style={{fontSize:10,color:"rgba(100,116,139,0.6)",textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:700,marginBottom:6}}>Notes</div>
                <div style={{fontSize:13,color:"rgba(200,212,228,0.85)",lineHeight:1.6}}>{expense.notes}</div>
              </div>
            )}

            {/* Receipt */}
            <div style={{background:expense.fileName?"rgba(56,189,248,0.06)":"rgba(255,255,255,0.03)",border:`1px solid ${expense.fileName?"rgba(56,189,248,0.2)":"rgba(255,255,255,0.06)"}`,borderRadius:12,padding:"14px 16px",marginBottom:20}}>
              <div style={{fontSize:10,color:"rgba(100,116,139,0.6)",textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:700,marginBottom:8}}>Receipt / Document</div>
              {expense.fileName
                ?<div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:36,height:36,borderRadius:10,background:"rgba(56,189,248,0.12)",border:"1px solid rgba(56,189,248,0.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>📎</div>
                    <div>
                      <div style={{fontSize:13,fontWeight:600,color:"#38bdf8"}}>{expense.fileName}</div>
                      <div style={{fontSize:11,color:"rgba(100,116,139,0.6)",marginTop:2}}>Attached · tap to view when cloud storage is connected</div>
                    </div>
                  </div>
                :<div style={{fontSize:13,color:"rgba(100,116,139,0.5)",fontStyle:"italic"}}>No receipt attached — tap Edit to add one</div>
              }
            </div>

            {/* Action buttons */}
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>{setShowDetail(false);onEdit(expense);}} style={{flex:1,padding:"13px",border:"1px solid rgba(56,189,248,0.3)",borderRadius:14,background:"rgba(56,189,248,0.08)",color:"#38bdf8",fontSize:14,fontWeight:700,fontFamily:"'Outfit',sans-serif",cursor:"pointer"}}>✎ Edit</button>
              <button onClick={()=>{onToggle(expense.id);setShowDetail(false);}} style={{flex:1,padding:"13px",border:`1px solid ${expense.reimbursed?"rgba(251,191,36,0.3)":"rgba(52,211,153,0.3)"}`,borderRadius:14,background:expense.reimbursed?"rgba(251,191,36,0.08)":"rgba(52,211,153,0.08)",color:expense.reimbursed?"#fbbf24":"#34d399",fontSize:14,fontWeight:700,fontFamily:"'Outfit',sans-serif",cursor:"pointer"}}>
                {expense.reimbursed?"Mark Pending":"Mark Reimbursed"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Pages ───────────────────────────────────────────────────────────────── */
function Dashboard({expenses,setPage,onToggle,onDelete,onEdit}) {
  const [year,setYear]=useState(CY);
  const recent=[...expenses].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
  return (
    <div style={{maxWidth:480,margin:"0 auto",padding:"24px 16px"}}>
      <div className="fu" style={{marginBottom:24}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#0ea5e9,#2563eb)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,boxShadow:"0 0 20px rgba(14,165,233,0.4)"}}>⚕</div>
          <div>
            <div style={{fontFamily:"'DM Serif Display',serif",fontSize:22,color:"#f8fafc",lineHeight:1}}>HSA Vault</div>
            <div style={{fontSize:10,color:"rgba(56,189,248,0.6)",fontWeight:600,letterSpacing:"0.12em",textTransform:"uppercase"}}>Medical Expense Tracker</div>
          </div>
        </div>
      </div>
      <YearTabs year={year} setYear={setYear}/>
      <HeroCard expenses={expenses} year={year}/>
      <PieChart expenses={expenses} year={year}/>
      <div className="glass fu3" style={{borderRadius:20,padding:"20px",border:"1px solid rgba(255,255,255,0.06)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:"rgba(148,163,184,0.5)"}}>Recent</div>
          {expenses.length>5&&<button onClick={()=>setPage("history")} style={{background:"none",border:"none",color:"#38bdf8",fontSize:12,cursor:"pointer",fontFamily:"'Outfit',sans-serif",fontWeight:600}}>View All →</button>}
        </div>
        {recent.length===0
          ?<div style={{textAlign:"center",color:"rgba(100,116,139,0.5)",fontSize:14,padding:"28px 0"}}>No expenses yet<br/><span style={{fontSize:12,opacity:0.6}}>Tap + to log your first expense</span></div>
          :recent.map((e,i)=><ExpRow key={e.id} expense={e} onDelete={onDelete} onToggle={onToggle} onEdit={onEdit} delay={i*0.04}/>)
        }
      </div>
    </div>
  );
}

function History({expenses,onDelete,onToggle,onEdit}) {
  const [year,setYear]=useState("all");
  const [search,setSearch]=useState("");
  const [cat,setCat]=useState("All");
  const [status,setStatus]=useState("All");
  const [sort,setSort]=useState("date-new");
  const [patientFilter,setPatientFilter]=useState("All");

  // Build unique patient list
  const patients=["All",...[...new Set(expenses.map(e=>e.patient).filter(Boolean))].sort()];

  const filtered=expenses
    .filter(e=>year==="all"||new Date(e.date+"T00:00:00").getFullYear()===year)
    .filter(e=>cat==="All"||e.category===cat)
    .filter(e=>status==="All"||(status==="Pending"?!e.reimbursed:e.reimbursed))
    .filter(e=>patientFilter==="All"||e.patient===patientFilter)
    .filter(e=>!search||e.provider?.toLowerCase().includes(search.toLowerCase())||e.notes?.toLowerCase().includes(search.toLowerCase())||e.patient?.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b)=>{
      if(sort==="date-new") return b.date.localeCompare(a.date);
      if(sort==="date-old") return a.date.localeCompare(b.date);
      if(sort==="amount-high") return (parseFloat(b.amount)||0)-(parseFloat(a.amount)||0);
      if(sort==="amount-low")  return (parseFloat(a.amount)||0)-(parseFloat(b.amount)||0);
      if(sort==="patient")     return (a.patient||"").localeCompare(b.patient||"");
      return 0;
    });

  const total=filtered.reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
  const reimb=filtered.filter(e=>e.reimbursed).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
  return (
    <div style={{maxWidth:480,margin:"0 auto",padding:"24px 16px"}}>
      <div className="fu" style={{fontFamily:"'DM Serif Display',serif",fontSize:26,color:"#f8fafc",marginBottom:16}}>All Expenses</div>
      <div className="fu1" style={{position:"relative",marginBottom:14}}>
        <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:14,color:"rgba(100,116,139,0.5)"}}>⌕</span>
        <input className="glass" style={{width:"100%",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,color:"#e2e8f0",fontSize:14,padding:"12px 14px 12px 36px",outline:"none",fontFamily:"'Outfit',sans-serif",boxSizing:"border-box",background:"rgba(15,23,42,0.5)"}} placeholder="Search provider, patient, or notes…" value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>
      <YearTabs year={year} setYear={setYear}/>

      {/* Status filter */}
      <div className="fu2" style={{display:"flex",gap:6,marginBottom:10}}>
        {[["All","rgba(148,163,184,0.6)"],["Pending","#fbbf24"],["Reimbursed","#34d399"]].map(([s,c])=>(
          <button key={s} className="pill" onClick={()=>setStatus(s)} style={{padding:"6px 14px",borderRadius:20,border:`1px solid ${status===s?c:"rgba(255,255,255,0.06)"}`,background:status===s?`${c}18`:"transparent",color:status===s?c:"rgba(100,116,139,0.7)",fontSize:12,fontWeight:600,fontFamily:"'Outfit',sans-serif",cursor:"pointer"}}>
            {s==="Pending"?"⏳ ":s==="Reimbursed"?"✓ ":""}{s}
          </button>
        ))}
      </div>

      {/* Sort */}
      <div className="fu2" style={{display:"flex",gap:6,overflowX:"auto",marginBottom:10,scrollbarWidth:"none",paddingBottom:2}}>
        {[["date-new","Newest"],["date-old","Oldest"],["amount-high","$ High"],["amount-low","$ Low"],["patient","Patient"]].map(([v,l])=>(
          <button key={v} className="pill" onClick={()=>setSort(v)} style={{padding:"5px 12px",borderRadius:20,border:`1px solid ${sort===v?"rgba(139,92,246,0.5)":"rgba(255,255,255,0.05)"}`,background:sort===v?"rgba(139,92,246,0.12)":"transparent",color:sort===v?"#c084fc":"rgba(100,116,139,0.6)",fontSize:11,fontWeight:600,fontFamily:"'Outfit',sans-serif",cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>{l}</button>
        ))}
      </div>

      {/* Patient filter — only show if multiple patients */}
      {patients.length>2&&(
        <div className="fu2" style={{display:"flex",gap:5,overflowX:"auto",marginBottom:10,scrollbarWidth:"none",paddingBottom:2}}>
          {patients.map(p=>(
            <button key={p} className="pill" onClick={()=>setPatientFilter(p)} style={{padding:"5px 12px",borderRadius:20,border:`1px solid ${patientFilter===p?"rgba(249,168,212,0.5)":"rgba(255,255,255,0.05)"}`,background:patientFilter===p?"rgba(249,168,212,0.12)":"transparent",color:patientFilter===p?"#f9a8d4":"rgba(100,116,139,0.6)",fontSize:11,fontWeight:600,fontFamily:"'Outfit',sans-serif",cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>👤 {p}</button>
          ))}
        </div>
      )}

      {/* Category filter */}
      <div className="fu2" style={{display:"flex",gap:5,overflowX:"auto",marginBottom:16,scrollbarWidth:"none",paddingBottom:4}}>
        {["All",...CATEGORIES].map(c=>(
          <button key={c} className="pill" onClick={()=>setCat(c)} style={{padding:"5px 12px",borderRadius:20,border:`1px solid ${cat===c?"rgba(255,255,255,0.2)":"rgba(255,255,255,0.05)"}`,background:cat===c?"rgba(255,255,255,0.08)":"transparent",color:cat===c?"#e2e8f0":"rgba(100,116,139,0.6)",fontSize:11,fontWeight:600,fontFamily:"'Outfit',sans-serif",cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>{c}</button>
        ))}
      </div>

      <div className="fu3" style={{display:"flex",gap:8,marginBottom:16}}>
        {[[fmt(total),"Total","rgba(56,189,248,0.08)","rgba(56,189,248,0.18)","#38bdf8"],[fmt(reimb),"Reimbursed","rgba(52,211,153,0.08)","rgba(52,211,153,0.18)","#34d399"],[fmt(total-reimb),"Pending","rgba(251,191,36,0.07)","rgba(251,191,36,0.18)","#fbbf24"]].map(([val,label,bg,border,color])=>(
          <div key={label} style={{flex:1,background:bg,border:`1px solid ${border}`,borderRadius:12,padding:"10px",textAlign:"center"}}>
            <div style={{fontSize:13,fontWeight:700,color,fontFamily:"'Outfit',sans-serif"}}>{val}</div>
            <div style={{fontSize:9,color:"rgba(100,116,139,0.7)",marginTop:2,textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:600}}>{label}</div>
          </div>
        ))}
      </div>
      <div className="glass fu4" style={{borderRadius:20,padding:"16px",border:"1px solid rgba(255,255,255,0.06)"}}>
        {filtered.length===0
          ?<div style={{textAlign:"center",color:"rgba(100,116,139,0.5)",fontSize:14,padding:"32px 0"}}>No expenses found</div>
          :filtered.map((e,i)=><ExpRow key={e.id} expense={e} onDelete={onDelete} onToggle={onToggle} onEdit={onEdit} delay={i*0.03}/>)
        }
      </div>
    </div>
  );
}

function NotEligibleAccordion() {
  const [open,setOpen]=useState(false);
  return (
    <div style={{marginBottom:16}}>
      <button onClick={()=>setOpen(v=>!v)} style={{width:"100%",background:"none",border:"none",cursor:"pointer",padding:0,textAlign:"left"}}>
        <div style={{background:"rgba(248,113,113,0.04)",border:"1px solid rgba(248,113,113,0.2)",borderRadius:open?"16px 16px 0 0":16,padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",transition:"border-radius 0.2s"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:36,height:36,borderRadius:10,background:"rgba(248,113,113,0.12)",border:"1px solid rgba(248,113,113,0.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>✗</div>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:"rgba(248,113,113,0.9)"}}>Common Items NOT Eligible</div>
              <div style={{fontSize:11,color:"rgba(100,116,139,0.6)",marginTop:1}}>{NOT_ELIGIBLE.length} items — toothpaste, gym, vitamins & more</div>
            </div>
          </div>
          <div style={{fontSize:18,color:"rgba(248,113,113,0.4)",transition:"transform 0.2s",transform:open?"rotate(180deg)":"rotate(0deg)"}}>⌄</div>
        </div>
      </button>
      {open&&(
        <div style={{background:"rgba(248,113,113,0.03)",border:"1px solid rgba(248,113,113,0.15)",borderTop:"none",borderRadius:"0 0 16px 16px",overflow:"hidden"}}>
          {NOT_ELIGIBLE.map((item,i)=>(
            <div key={i} style={{padding:"11px 16px",borderBottom:i<NOT_ELIGIBLE.length-1?"1px solid rgba(255,255,255,0.04)":"none",display:"flex",gap:12,alignItems:"flex-start"}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:"#f87171",flexShrink:0,marginTop:5,boxShadow:"0 0 6px rgba(248,113,113,0.5)"}}/>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:"rgba(248,113,113,0.9)",marginBottom:2}}>{item.n}</div>
                <div style={{fontSize:11,color:"rgba(100,116,139,0.7)",lineHeight:1.5}}>{item.d}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Eligible() {
  const [search,setSearch]=useState("");
  const [expanded,setExpanded]=useState(null);
  const allCats=Object.keys(ELIGIBLE);
  const q=search.toLowerCase().trim();
  const filtered=q
    ?allCats.reduce((acc,cat)=>{
        const items=ELIGIBLE[cat].filter(e=>e.n.toLowerCase().includes(q)||e.d.toLowerCase().includes(q)||cat.toLowerCase().includes(q));
        if(items.length) acc[cat]=items;
        return acc;
      },{})
    :ELIGIBLE;
  const notMatches=q?NOT_ELIGIBLE.filter(e=>e.n.toLowerCase().includes(q)||e.d.toLowerCase().includes(q)):[];
  const totalItems=Object.values(filtered).reduce((s,a)=>s+a.length,0);
  return (
    <div style={{maxWidth:480,margin:"0 auto",padding:"24px 16px"}}>
      <div className="fu" style={{marginBottom:20}}>
        <div style={{fontFamily:"'DM Serif Display',serif",fontSize:26,color:"#f8fafc",marginBottom:4}}>What's Eligible</div>
        <div style={{fontSize:12,color:"rgba(100,116,139,0.6)"}}>Sourced from IRS Publication 502 · 2024</div>
      </div>
      <div className="fu1" style={{position:"relative",marginBottom:14}}>
        <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:16,color:"rgba(100,116,139,0.5)"}}>⌕</span>
        <input className="glass" style={{width:"100%",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,color:"#e2e8f0",fontSize:14,padding:"13px 14px 13px 40px",outline:"none",fontFamily:"'Outfit',sans-serif",boxSizing:"border-box",background:"rgba(15,23,42,0.5)"}} placeholder="Search… e.g. CPAP, therapy, toothbrush" value={search} onChange={e=>setSearch(e.target.value)}/>
        {search&&<button onClick={()=>setSearch("")} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"rgba(100,116,139,0.6)",cursor:"pointer",fontSize:18,lineHeight:1}}>×</button>}
      </div>
      <div className="fu1" style={{fontSize:12,color:"rgba(100,116,139,0.5)",marginBottom:14,fontWeight:500}}>
        {q?`${totalItems+notMatches.length} result${totalItems+notMatches.length!==1?"s":""} for "${search}"`:`${totalItems} eligible expenses · ${NOT_ELIGIBLE.length} not eligible`}
      </div>
      {!q&&(
        <div className="fu2" style={{background:"rgba(56,189,248,0.06)",border:"1px solid rgba(56,189,248,0.15)",borderRadius:14,padding:"12px 14px",marginBottom:16,fontSize:12,color:"rgba(100,116,139,0.8)",lineHeight:1.6}}>
          <span style={{color:"#38bdf8",fontWeight:600}}>Source: IRS Publication 502 (2024)</span> — Always keep receipts. When in doubt, consult a tax professional.
        </div>
      )}
      {/* Eligible categories */}
      {Object.keys(filtered).length===0&&notMatches.length===0?(
        <div className="glass" style={{borderRadius:20,padding:"40px 20px",textAlign:"center",border:"1px solid rgba(255,255,255,0.06)"}}>
          <div style={{fontSize:28,marginBottom:10}}>🔍</div>
          <div style={{color:"rgba(100,116,139,0.6)",fontSize:14}}>No results for "{search}"</div>
        </div>
      ):(
        Object.entries(filtered).map(([cat,items],ci)=>{
          const color=CAT_COLORS[cat]||"#94a3b8";
          const icon=CAT_ICONS[cat]||"📋";
          const open=q||expanded===cat;
          return (
            <div key={cat} style={{marginBottom:10}}>
              <button onClick={()=>setExpanded(open&&!q?null:cat)} style={{width:"100%",background:"none",border:"none",cursor:"pointer",padding:0,textAlign:"left"}}>
                <div className="glass" style={{borderRadius:16,padding:"14px 16px",border:`1px solid ${open?color+"30":"rgba(255,255,255,0.06)"}`,background:open?`${color}06`:"rgba(15,23,42,0.55)",transition:"all 0.2s"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:36,height:36,borderRadius:10,background:`${color}18`,border:`1px solid ${color}28`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{icon}</div>
                      <div>
                        <div style={{fontSize:14,fontWeight:700,color:"#e2e8f0"}}>{cat}</div>
                        <div style={{fontSize:11,color:"rgba(100,116,139,0.6)",marginTop:1}}>{items.length} eligible expense{items.length!==1?"s":""}</div>
                      </div>
                    </div>
                    <div style={{fontSize:18,color:"rgba(100,116,139,0.4)",transition:"transform 0.2s",transform:open?"rotate(180deg)":"rotate(0deg)"}}>⌄</div>
                  </div>
                </div>
              </button>
              {open&&(
                <div style={{marginTop:4,background:"rgba(8,12,20,0.6)",border:`1px solid ${color}18`,borderRadius:14,overflow:"hidden"}}>
                  {items.map((item,ii)=>(
                    <div key={ii} style={{padding:"12px 16px",borderBottom:ii<items.length-1?"1px solid rgba(255,255,255,0.04)":"none",display:"flex",gap:12,alignItems:"flex-start"}}>
                      <div style={{width:6,height:6,borderRadius:"50%",background:color,flexShrink:0,marginTop:5,boxShadow:`0 0 6px ${color}80`}}/>
                      <div>
                        <div style={{fontSize:13,fontWeight:600,color:"#dde3f0",marginBottom:2}}>{item.n}</div>
                        <div style={{fontSize:11,color:"rgba(100,116,139,0.7)",lineHeight:1.5}}>{item.d}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
      {/* Not eligible — search results */}
      {q&&notMatches.length>0&&(
        <div style={{marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:"rgba(248,113,113,0.7)",marginBottom:10}}>✗ Not Eligible</div>
          <div style={{background:"rgba(248,113,113,0.04)",border:"1px solid rgba(248,113,113,0.15)",borderRadius:16,overflow:"hidden"}}>
            {notMatches.map((item,i)=>(
              <div key={i} style={{padding:"11px 16px",borderBottom:i<notMatches.length-1?"1px solid rgba(255,255,255,0.04)":"none",display:"flex",gap:12,alignItems:"flex-start"}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:"#f87171",flexShrink:0,marginTop:5}}/>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:"rgba(248,113,113,0.9)",marginBottom:2}}>{item.n}</div>
                  <div style={{fontSize:11,color:"rgba(100,116,139,0.7)",lineHeight:1.5}}>{item.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Not eligible — accordion when not searching */}
      {!q&&<NotEligibleAccordion/>}
      <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:14,padding:"14px 16px",fontSize:12,color:"rgba(100,116,139,0.6)",lineHeight:1.7}}>
        This list is for informational purposes only. IRS Publication 502 is updated annually. Always verify with a qualified tax professional.
      </div>
    </div>
  );
}

function Summary({expenses}) {
  const byYear={};
  expenses.forEach(e=>{
    const y=new Date(e.date+"T00:00:00").getFullYear();
    if(!byYear[y]) byYear[y]={total:0,reimb:0,count:0,pending:0,cats:{}};
    const amt=parseFloat(e.amount)||0;
    byYear[y].total+=amt;byYear[y].count++;
    if(e.reimbursed) byYear[y].reimb+=amt; else byYear[y].pending++;
    byYear[y].cats[e.category]=(byYear[y].cats[e.category]||0)+amt;
  });
  const years=Object.keys(byYear).sort((a,b)=>b-a);
  const gT=expenses.reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
  const gR=expenses.filter(e=>e.reimbursed).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
  return (
    <div style={{maxWidth:480,margin:"0 auto",padding:"24px 16px"}}>
      <div className="fu" style={{marginBottom:24}}>
        <div style={{fontFamily:"'DM Serif Display',serif",fontSize:26,color:"#f8fafc",marginBottom:4}}>Summary</div>
        <div style={{fontSize:12,color:"rgba(100,116,139,0.6)"}}>Your lifetime HSA reimbursement record</div>
      </div>
      {expenses.length>0&&(
        <div className="fu1 glass" style={{borderRadius:20,padding:"20px",marginBottom:20,border:"1px solid rgba(56,189,248,0.15)",background:"linear-gradient(135deg,rgba(14,165,233,0.08),rgba(37,99,235,0.06))"}}>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:"rgba(56,189,248,0.7)",marginBottom:8}}>Lifetime Total</div>
          <div style={{fontFamily:"'DM Serif Display',serif",fontSize:34,color:"#f8fafc",marginBottom:12}}>{fmt(gT)}</div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:13}}>
            <span style={{color:"#34d399",fontWeight:600}}>{fmt(gR)} reimbursed</span>
            <span style={{color:"#fbbf24",fontWeight:600}}>{fmt(gT-gR)} pending</span>
          </div>
          <div style={{marginTop:10,height:4,borderRadius:2,background:"rgba(255,255,255,0.06)",overflow:"hidden"}}>
            <div style={{height:"100%",borderRadius:2,width:`${gT>0?(gR/gT)*100:0}%`,background:"linear-gradient(90deg,#0ea5e9,#34d399)",transition:"width 1s ease"}}/>
          </div>
        </div>
      )}
      {years.length===0
        ?<div className="glass fu2" style={{borderRadius:20,padding:"40px",textAlign:"center",color:"rgba(100,116,139,0.5)",border:"1px solid rgba(255,255,255,0.05)"}}>No expenses logged yet</div>
        :years.map((y,yi)=>{
          const d=byYear[y];const pct=d.total>0?(d.reimb/d.total)*100:0;
          const topCats=Object.entries(d.cats).sort((a,b)=>b[1]-a[1]).slice(0,3);
          return (
            <div key={y} className="glass fu2" style={{borderRadius:20,padding:"20px",marginBottom:14,border:"1px solid rgba(255,255,255,0.06)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
                <div>
                  <div style={{fontFamily:"'DM Serif Display',serif",fontSize:22,color:"#f8fafc"}}>{y}</div>
                  <div style={{fontSize:12,color:"rgba(100,116,139,0.6)",marginTop:2}}>{d.count} expense{d.count!==1?"s":""}{d.pending>0?<span style={{color:"#fbbf24"}}> · {d.pending} pending</span>:<span style={{color:"#34d399"}}> · done ✓</span>}</div>
                </div>
                <div style={{fontFamily:"'Outfit',sans-serif",fontSize:22,fontWeight:700,color:"#38bdf8"}}>{fmt(d.total)}</div>
              </div>
              <div style={{display:"flex",gap:8,marginBottom:14}}>
                <div style={{flex:1,background:"rgba(52,211,153,0.07)",border:"1px solid rgba(52,211,153,0.15)",borderRadius:10,padding:"8px 10px"}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#34d399",fontFamily:"'Outfit',sans-serif"}}>{fmt(d.reimb)}</div>
                  <div style={{fontSize:9,color:"rgba(52,211,153,0.6)",textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:700,marginTop:2}}>Reimbursed</div>
                </div>
                <div style={{flex:1,background:"rgba(251,191,36,0.06)",border:"1px solid rgba(251,191,36,0.15)",borderRadius:10,padding:"8px 10px"}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#fbbf24",fontFamily:"'Outfit',sans-serif"}}>{fmt(d.total-d.reimb)}</div>
                  <div style={{fontSize:9,color:"rgba(251,191,36,0.6)",textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:700,marginTop:2}}>Pending</div>
                </div>
              </div>
              <div style={{marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                  <span style={{fontSize:10,color:"rgba(100,116,139,0.6)",textTransform:"uppercase",letterSpacing:"0.1em",fontWeight:700}}>Progress</span>
                  <span style={{fontSize:10,fontWeight:700,color:pct>=100?"#34d399":"#38bdf8"}}>{Math.round(pct)}%</span>
                </div>
                <div style={{height:4,borderRadius:2,background:"rgba(255,255,255,0.05)",overflow:"hidden"}}>
                  <div style={{height:"100%",borderRadius:2,width:`${pct}%`,background:pct>=100?"linear-gradient(90deg,#059669,#34d399)":"linear-gradient(90deg,#0ea5e9,#34d399)",transition:"width 0.8s ease"}}/>
                </div>
              </div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                {topCats.map(([cat,amt])=>(
                  <span key={cat} style={{fontSize:11,fontWeight:600,padding:"4px 9px",borderRadius:10,background:`${CAT_COLORS[cat]||"#94a3b8"}15`,color:CAT_COLORS[cat]||"#94a3b8",border:`1px solid ${CAT_COLORS[cat]||"#94a3b8"}25`}}>{CAT_ICONS[cat]} {cat} · {fmt(amt)}</span>
                ))}
              </div>
            </div>
          );
        })
      }
      <div className="fu5" style={{borderRadius:20,padding:"18px",background:"linear-gradient(135deg,rgba(52,211,153,0.06),rgba(14,165,233,0.04))",border:"1px solid rgba(52,211,153,0.12)"}}>
        <div style={{fontSize:12,fontWeight:700,color:"#34d399",marginBottom:8}}>💡 Remember</div>
        <div style={{fontSize:12,color:"rgba(100,116,139,0.8)",lineHeight:1.7}}>You can reimburse yourself from your HSA at any time — even decades later — as long as the expense was incurred after your HSA opened and you have documentation.</div>
      </div>
    </div>
  );
}

/* ── Export Page ─────────────────────────────────────────────────────────── */
function Export({expenses}) {
  const allYears=[...new Set(expenses.map(e=>new Date(e.date+"T00:00:00").getFullYear()))].sort((a,b)=>b-a);
  const minYear=allYears[allYears.length-1]||CY;
  const maxYear=allYears[0]||CY;
  const [yearFrom,setYearFrom]=useState(minYear);
  const [yearTo,setYearTo]=useState(maxYear);
  const [status,setStatus]=useState("all");
  const [done,setDone]=useState(false);

  const filtered=expenses
    .filter(e=>{const y=new Date(e.date+"T00:00:00").getFullYear();return y>=yearFrom&&y<=yearTo;})
    .filter(e=>status==="all"?true:status==="reimbursed"?e.reimbursed:!e.reimbursed)
    .sort((a,b)=>a.date.localeCompare(b.date));

  const total=filtered.reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
  const reimb=filtered.filter(e=>e.reimbursed).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
  const pending=total-reimb;

  const downloadCSV=()=>{
    const headers=["Date","Patient","Provider","Category","Expense Type","Amount","Payment Type","Reimbursed","Notes","Receipt File"];
    const rows=filtered.map(e=>[
      e.date,
      `"${(e.patient||"").replace(/"/g,'""')}"`,
      `"${(e.provider||"").replace(/"/g,'""')}"`,
      `"${e.category}"`,
      `"${(e.subcategory||"").replace(/"/g,'""')}"`,
      (parseFloat(e.amount)||0).toFixed(2),
      `"${e.paymentType}"`,
      e.reimbursed?"Yes":"No",
      `"${(e.notes||"").replace(/"/g,'""')}"`,
      `"${e.fileName||""}"`,
    ]);
    const csv=[headers.join(","),...rows.map(r=>r.join(","))].join("\n");
    const blob=new Blob([csv],{type:"text/csv"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url; a.download=`HSA_Expenses_${yearFrom}_${yearTo}.csv`; a.click();
    URL.revokeObjectURL(url);
    setDone(true); setTimeout(()=>setDone(false),2500);
  };

  const downloadHTML=()=>{
    const byYear={};
    filtered.forEach(e=>{
      const y=new Date(e.date+"T00:00:00").getFullYear();
      if(!byYear[y]) byYear[y]=[];
      byYear[y].push(e);
    });
    const html=`<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>HSA Expense Report ${yearFrom}–${yearTo}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Helvetica Neue',Arial,sans-serif;color:#1a1a2e;padding:40px;max-width:900px;margin:0 auto}
  h1{font-size:28px;margin-bottom:4px;color:#0f172a}
  .sub{font-size:13px;color:#64748b;margin-bottom:32px}
  .summary{display:flex;gap:24px;margin-bottom:36px;padding:20px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0}
  .stat{flex:1;text-align:center}
  .stat-val{font-size:22px;font-weight:700;color:#0f172a}
  .stat-label{font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.08em;margin-top:3px}
  h2{font-size:18px;font-weight:700;color:#0f172a;margin:28px 0 12px;padding-bottom:8px;border-bottom:2px solid #e2e8f0}
  table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px}
  th{background:#f1f5f9;padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#64748b;font-weight:600}
  td{padding:10px 12px;border-bottom:1px solid #f1f5f9;vertical-align:top}
  tr:last-child td{border-bottom:none}
  .tag{display:inline-block;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600}
  .done{background:#dcfce7;color:#166534}
  .pending{background:#fef9c3;color:#854d0e}
  .yr-total{font-size:13px;color:#64748b;margin-bottom:24px;padding:10px 12px;background:#f8fafc;border-radius:8px}
  .footer{margin-top:40px;padding-top:20px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8}
  @media print{body{padding:20px}.summary{break-inside:avoid}table{break-inside:auto}tr{break-inside:avoid}}
</style></head><body>
<h1>HSA Expense Report</h1>
<div class="sub">Generated ${new Date().toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})} · ${yearFrom===yearTo?yearFrom:`${yearFrom}–${yearTo}`} · ${filtered.length} expense${filtered.length!==1?"s":""}</div>
<div class="summary">
  <div class="stat"><div class="stat-val">$${total.toFixed(2)}</div><div class="stat-label">Total</div></div>
  <div class="stat"><div class="stat-val" style="color:#166534">$${reimb.toFixed(2)}</div><div class="stat-label">Reimbursed</div></div>
  <div class="stat"><div class="stat-val" style="color:#854d0e">$${pending.toFixed(2)}</div><div class="stat-label">Pending</div></div>
  <div class="stat"><div class="stat-val">${filtered.length}</div><div class="stat-label">Expenses</div></div>
</div>
${Object.entries(byYear).sort((a,b)=>b[0]-a[0]).map(([yr,exps])=>{
  const yrTotal=exps.reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
  const yrReim=exps.filter(e=>e.reimbursed).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
  return `<h2>${yr}</h2>
<div class="yr-total">${exps.length} expense${exps.length!==1?"s":"s"} · Total: <strong>$${yrTotal.toFixed(2)}</strong> · Reimbursed: <strong>$${yrReim.toFixed(2)}</strong> · Pending: <strong>$${(yrTotal-yrReim).toFixed(2)}</strong></div>
<table><thead><tr><th>Date</th><th>Patient</th><th>Provider</th><th>Category</th><th>Amount</th><th>Payment</th><th>Status</th><th>Receipt</th></tr></thead><tbody>
${exps.map(e=>`<tr>
  <td>${fmtDate(e.date)}</td>
  <td>${e.patient||"—"}</td>
  <td><strong>${e.provider||""}</strong>${e.subcategory?`<br><span style="font-size:11px;color:#64748b">${e.subcategory}</span>`:""}${e.notes?`<br><span style="font-size:11px;color:#94a3b8">${e.notes}</span>`:""}  </td>
  <td>${e.category}</td>
  <td><strong>$${(parseFloat(e.amount)||0).toFixed(2)}</strong></td>
  <td>${e.paymentType}</td>
  <td><span class="tag ${e.reimbursed?"done":"pending"}">${e.reimbursed?"✓ Reimbursed":"Pending"}</span></td>
  <td>${e.fileName?`📎 ${e.fileName}`:"—"}</td>
</tr>`).join("")}
</tbody></table>`;}).join("")}
<div class="footer">Generated by HSA Vault · For HSA reimbursement documentation purposes · Keep all original receipts · Consult a tax professional before making claims</div>
</body></html>`;
    const blob=new Blob([html],{type:"text/html"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url; a.download=`HSA_Report_${yearFrom}_${yearTo}.html`; a.click();
    URL.revokeObjectURL(url);
    setDone(true); setTimeout(()=>setDone(false),2500);
  };

  const selBtn=(active,label,onClick)=>({
    padding:"6px 14px",borderRadius:20,border:`1px solid ${active?"rgba(56,189,248,0.5)":"rgba(255,255,255,0.06)"}`,
    background:active?"rgba(56,189,248,0.12)":"transparent",color:active?"#38bdf8":"rgba(100,116,139,0.7)",
    fontSize:12,fontWeight:600,fontFamily:"'Outfit',sans-serif",cursor:"pointer",transition:"all 0.2s",
  });

  return (
    <div style={{maxWidth:480,margin:"0 auto",padding:"24px 16px"}}>
      <div className="fu" style={{marginBottom:24}}>
        <div style={{fontFamily:"'DM Serif Display',serif",fontSize:26,color:"#f8fafc",marginBottom:4}}>Export</div>
        <div style={{fontSize:12,color:"rgba(100,116,139,0.6)"}}>Download your records for HSA reimbursement claims</div>
      </div>

      {/* Filters */}
      <div className="glass fu1" style={{borderRadius:20,padding:"20px",marginBottom:16,border:"1px solid rgba(255,255,255,0.07)"}}>
        <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:"rgba(148,163,184,0.5)",marginBottom:14}}>Filter Export</div>

        {/* Year range */}
        <div style={{marginBottom:14}}>
          <div style={{fontSize:12,color:"rgba(148,163,184,0.7)",fontWeight:600,marginBottom:8}}>Year Range</div>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <select value={yearFrom} onChange={e=>setYearFrom(Number(e.target.value))} style={{flex:1,background:"rgba(15,23,42,0.8)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:10,color:"#e2e8f0",fontSize:14,padding:"10px 12px",fontFamily:"'Outfit',sans-serif",outline:"none"}}>
              {YEARS.map(y=><option key={y} value={y}>{y}</option>)}
            </select>
            <span style={{color:"rgba(100,116,139,0.5)",fontSize:13}}>to</span>
            <select value={yearTo} onChange={e=>setYearTo(Number(e.target.value))} style={{flex:1,background:"rgba(15,23,42,0.8)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:10,color:"#e2e8f0",fontSize:14,padding:"10px 12px",fontFamily:"'Outfit',sans-serif",outline:"none"}}>
              {YEARS.map(y=><option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {/* Status filter */}
        <div>
          <div style={{fontSize:12,color:"rgba(148,163,184,0.7)",fontWeight:600,marginBottom:8}}>Status</div>
          <div style={{display:"flex",gap:6}}>
            {[["all","All"],["pending","Pending Only"],["reimbursed","Reimbursed Only"]].map(([v,l])=>(
              <button key={v} onClick={()=>setStatus(v)} style={selBtn(status===v,l)}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="glass fu2" style={{borderRadius:20,padding:"20px",marginBottom:16,border:"1px solid rgba(255,255,255,0.07)"}}>
        <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:"rgba(148,163,184,0.5)",marginBottom:14}}>Export Preview</div>
        {filtered.length===0?(
          <div style={{textAlign:"center",padding:"20px 0",color:"rgba(100,116,139,0.5)",fontSize:13}}>No expenses match your filters</div>
        ):(
          <>
            <div style={{display:"flex",gap:8,marginBottom:16}}>
              {[[fmt(total),"Total","#38bdf8","rgba(56,189,248,0.08)","rgba(56,189,248,0.18)"],[fmt(reimb),"Reimbursed","#34d399","rgba(52,211,153,0.08)","rgba(52,211,153,0.18)"],[fmt(pending),"Pending","#fbbf24","rgba(251,191,36,0.07)","rgba(251,191,36,0.18)"]].map(([val,label,color,bg,border])=>(
                <div key={label} style={{flex:1,background:bg,border:`1px solid ${border}`,borderRadius:12,padding:"10px",textAlign:"center"}}>
                  <div style={{fontSize:13,fontWeight:700,color,fontFamily:"'Outfit',sans-serif"}}>{val}</div>
                  <div style={{fontSize:9,color:"rgba(100,116,139,0.7)",marginTop:2,textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:600}}>{label}</div>
                </div>
              ))}
            </div>
            <div style={{fontSize:12,color:"rgba(100,116,139,0.6)",marginBottom:8}}>{filtered.length} expense{filtered.length!==1?"s":""} · {yearFrom===yearTo?yearFrom:`${yearFrom} – ${yearTo}`}</div>
            {/* Sample rows */}
            <div style={{background:"rgba(255,255,255,0.03)",borderRadius:12,overflow:"hidden"}}>
              {filtered.slice(0,4).map((e,i)=>(
                <div key={e.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",borderBottom:i<Math.min(filtered.length,4)-1?"1px solid rgba(255,255,255,0.04)":"none"}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:600,color:"#e2e8f0",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{e.provider}</div>
                    <div style={{fontSize:10,color:"rgba(100,116,139,0.6)"}}>{fmtDate(e.date)} · {e.category}</div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0,marginLeft:8}}>
                    <span style={{fontSize:11,fontWeight:700,color:e.reimbursed?"#34d399":"#fbbf24"}}>{e.reimbursed?"✓":"○"}</span>
                    <span style={{fontSize:13,fontWeight:700,color:"#e2e8f0",fontFamily:"'Outfit',sans-serif"}}>{fmt(e.amount)}</span>
                  </div>
                </div>
              ))}
              {filtered.length>4&&<div style={{padding:"8px 12px",fontSize:11,color:"rgba(100,116,139,0.5)",textAlign:"center"}}>+{filtered.length-4} more expenses</div>}
            </div>
          </>
        )}
      </div>

      {/* Download buttons */}
      <div className="fu3" style={{display:"flex",flexDirection:"column",gap:10}}>
        <button onClick={downloadHTML} disabled={!filtered.length} className="glow-btn" style={{width:"100%",padding:"16px",border:"none",borderRadius:16,cursor:filtered.length?"pointer":"not-allowed",background:filtered.length?"linear-gradient(135deg,#0ea5e9,#2563eb)":"rgba(255,255,255,0.06)",color:filtered.length?"#fff":"rgba(100,116,139,0.5)",fontSize:15,fontWeight:700,fontFamily:"'Outfit',sans-serif",letterSpacing:"0.04em",boxShadow:filtered.length?"0 0 24px rgba(14,165,233,0.35)":"none",transition:"all 0.2s",display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
          <span style={{fontSize:20}}>📄</span>
          {done?"Downloaded!":"Download Report (HTML/Print to PDF)"}
        </button>
        <button onClick={downloadCSV} disabled={!filtered.length} style={{width:"100%",padding:"15px",border:"1px solid rgba(255,255,255,0.1)",borderRadius:16,cursor:filtered.length?"pointer":"not-allowed",background:"rgba(255,255,255,0.04)",color:filtered.length?"#e2e8f0":"rgba(100,116,139,0.5)",fontSize:14,fontWeight:600,fontFamily:"'Outfit',sans-serif",transition:"all 0.2s",display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
          <span style={{fontSize:18}}>📊</span>
          Download Spreadsheet (CSV)
        </button>
      </div>

      <div style={{marginTop:16,background:"rgba(56,189,248,0.05)",border:"1px solid rgba(56,189,248,0.12)",borderRadius:14,padding:"13px 15px",fontSize:12,color:"rgba(100,116,139,0.75)",lineHeight:1.8}}>
        <div style={{marginBottom:8}}><span style={{color:"#38bdf8",fontWeight:600}}>💡 For HSA claims:</span> Download the report, open it in your browser, and use Print → Save as PDF for a clean PDF to submit with your claim.</div>
        <div style={{marginBottom:8}}><span style={{color:"#fbbf24",fontWeight:600}}>📎 Receipt backup:</span> Your actual receipt files are stored securely in HSA Vault's cloud. To back them up yourself, open each expense, tap the receipt filename, and save it to your device or Google Drive. We recommend keeping a personal backup folder organized by year.</div>
        <div><span style={{color:"#34d399",fontWeight:600}}>⏳ No time limit:</span> Keep copies indefinitely — there is no statute of limitations on HSA self-reimbursements as long as expenses occurred after your HSA opened.</div>
      </div>
    </div>
  );
}

/* ── App ─────────────────────────────────────────────────────────────────── */
const NAV=[
  {id:"dashboard",label:"Home",   icon:<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h3a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h3a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/></svg>},
  {id:"history",  label:"History",icon:<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/></svg>},
  {id:"eligible", label:"Eligible",icon:<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>},
  {id:"summary",  label:"Summary",icon:<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zm6-4a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zm6-3a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/></svg>},
  {id:"export",   label:"Export",  icon:<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/></svg>},
];

export default function App({ user }) {
  const { expenses, loading, addExpense, updateExpense, toggleReimbursed, deleteExpense } = useExpenses(user?.uid);
  const [page,setPage]         = useState("dashboard");
  const [showAdd,setShowAdd]   = useState(false);
  const [editing,setEditing]   = useState(null);
  const [showOnboard,setShowOnboard] = useState(true);
  const [fileToUpload,setFileToUpload] = useState(null);

  const handleAdd = async (data, file) => {
    await addExpense(user.uid, data, file);
    setShowAdd(false);
    setFileToUpload(null);
  };

  const handleEdit = async (data, file) => {
    await updateExpense(user.uid, data.id, data, file);
    setEditing(null);
  };

  const handleDelete = async (expense) => {
    if (window.confirm("Delete this expense?")) {
      await deleteExpense(user.uid, expense);
    }
  };

  const handleToggle = async (expense) => {
    await toggleReimbursed(user.uid, expense.id, expense.reimbursed);
  };

  const handleSignOut = async () => {
    if (window.confirm("Sign out of HSA Vault?")) {
      await signOut(auth);
    }
  };

  if (loading) {
    return (
      <div style={{minHeight:"100vh",background:"#020509",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <style>{CSS}</style>
        <BG/>
        <div style={{textAlign:"center",position:"relative",zIndex:1}}>
          <div style={{fontSize:36,marginBottom:12}}>⚕</div>
          <div style={{fontFamily:"'Outfit',sans-serif",fontSize:14,color:"rgba(100,116,139,0.6)"}}>Loading your vault…</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{minHeight:"100vh",fontFamily:"'Outfit',sans-serif",color:"#e2e8f0",position:"relative",paddingBottom:showOnboard?0:90}}>
      <style>{CSS}</style>
      {showOnboard && <Onboarding onDone={()=>setShowOnboard(false)}/>}
      {!showOnboard && (
        <>
          <BG/>
          {/* Sign out button */}
          <div style={{position:"fixed",top:12,right:16,zIndex:60}}>
            <button onClick={handleSignOut} title={`Signed in as ${user?.displayName||user?.email}`} style={{background:"rgba(15,23,42,0.8)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:20,padding:"6px 12px",color:"rgba(100,116,139,0.7)",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif",backdropFilter:"blur(10px)",display:"flex",alignItems:"center",gap:6}}>
              <div style={{width:22,height:22,borderRadius:"50%",background:"linear-gradient(135deg,#0ea5e9,#2563eb)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#fff",fontWeight:700,flexShrink:0}}>
                {(user?.displayName||user?.email||"?")[0].toUpperCase()}
              </div>
              Sign Out
            </button>
          </div>

          <div style={{position:"relative",zIndex:1}}>
            {page==="dashboard" && <Dashboard expenses={expenses} setPage={setPage} onToggle={e=>handleToggle(e)} onDelete={handleDelete} onEdit={setEditing}/>}
            {page==="history"   && <History   expenses={expenses} onDelete={handleDelete} onToggle={e=>handleToggle(e)} onEdit={setEditing}/>}
            {page==="eligible"  && <Eligible/>}
            {page==="summary"   && <Summary   expenses={expenses}/>}
            {page==="export"    && <Export    expenses={expenses}/>}
          </div>

          <button onClick={()=>setShowAdd(true)} className="glow-btn" style={{position:"fixed",bottom:84,right:20,width:56,height:56,borderRadius:"50%",border:"none",background:"linear-gradient(135deg,#0ea5e9,#2563eb)",color:"#fff",fontSize:28,cursor:"pointer",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",animation:"glowPulse 3s ease-in-out infinite"}}>+</button>

          <nav style={{position:"fixed",bottom:0,left:0,right:0,zIndex:50,display:"flex",justifyContent:"space-around",padding:"12px 0 20px",background:"rgba(2,5,9,0.88)",backdropFilter:"blur(20px)",borderTop:"1px solid rgba(255,255,255,0.06)"}}>
            {NAV.map(item=>{
              const active=page===item.id;
              return (
                <button key={item.id} onClick={()=>setPage(item.id)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,background:"none",border:"none",color:active?"#38bdf8":"rgba(100,116,139,0.6)",cursor:"pointer",fontFamily:"'Outfit',sans-serif",fontSize:10,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",padding:"4px 12px",transition:"color 0.2s"}}>
                  <span style={{filter:active?"drop-shadow(0 0 6px rgba(56,189,248,0.7))":"none",transition:"filter 0.2s"}}>{item.icon}</span>
                  {item.label}
                </button>
              );
            })}
          </nav>

          {showAdd  && <AddModal  onClose={()=>setShowAdd(false)} onSave={handleAdd}/>}
          {editing  && <EditModal expense={editing} onClose={()=>setEditing(null)} onSave={handleEdit}/>}
        </>
      )}
    </div>
  );
}