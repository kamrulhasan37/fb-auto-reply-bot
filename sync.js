import cfg from './config.js';
const ok=cfg&&cfg.apiKey&&!cfg.apiKey.startsWith('YOUR');
window.cloud={on:false};
if(ok){try{
const A='https://www.gstatic.com/firebasejs/10.14.1/';
const [{initializeApp},{getAuth,GoogleAuthProvider,signInWithPopup,signInWithRedirect,getRedirectResult,onAuthStateChanged,signOut},{initializeFirestore,persistentLocalCache,doc,getDoc,setDoc}]=await Promise.all([import(A+'firebase-app.js'),import(A+'firebase-auth.js'),import(A+'firebase-firestore.js')]);
const app=initializeApp(cfg),auth=getAuth(app),db=initializeFirestore(app,{localCache:persistentLocalCache()});
let ref=null,ready=false,timer,cur=null;
const cloud=window.cloud={on:true,user:null,status:'',err:''};
const st=t=>{cloud.status=t;render()};
const prov=new GoogleAuthProvider();
cloud.login=async()=>{cloud.err='';render();
  try{await signInWithPopup(auth,prov)}
  catch(e){if(e.code=='auth/popup-blocked'){signInWithRedirect(auth,prov)}else if(e.code!='auth/cancelled-popup-request'&&e.code!='auth/popup-closed-by-user'){cloud.err='লগইন হয়নি। নেট দেখে আবার চেষ্টা করুন।';render()}}};
cloud.logout=()=>signOut(auth);
getRedirectResult(auth).catch(()=>{});
const empty=d=>!d.t.length&&!d.ln.length&&!d.sv.length&&!d.ev.length&&!d.tr.length&&d.w.every(w=>!w.b);
const mg=(a,b)=>{const i=new Set(a.map(x=>x.id));return[...a,...b.filter(x=>!i.has(x.id))]};
const merge=(c,l)=>({...c,w:mg(c.w,l.w),t:mg(c.t,l.t),ln:mg(c.ln,l.ln),sv:mg(c.sv,l.sv),ev:mg(c.ev,l.ev),tr:mg(c.tr,l.tr)});
const up=()=>setDoc(ref,{d:JSON.stringify(hs.get()),u:Date.now()});
async function load(){
  try{const s=await getDoc(ref);
    if(!s.exists()){await up();ready=true;st('সেভ আছে ✓');return}
    const c=JSON.parse(s.data().d),l=hs.get();
    if(empty(l)||JSON.stringify(c)==JSON.stringify(l)){hs.set(c);ready=true;st('সেভ আছে ✓');return}
    st('কোন ডেটা রাখবেন তা বাছাই বাকি');
    sheet('দুই জায়গায় ডেটা আছে',[{k:'c',l:'এই ফোনের ডেটা আর আপনার ক্লাউডের ডেটা আলাদা। কোনটি রাখবেন?',t:'select',o:[['merge','দুটোই মিলিয়ে নেব (সব এন্ট্রি থাকবে)'],['cloud','শুধু ক্লাউডের ডেটা (এই ফোনেরটি বাদ)'],['local','শুধু এই ফোনের ডেটা (ক্লাউডেরটি বদলে যাবে)']],v:'merge'}],
      r=>{ready=true;if(r.c=='cloud')hs.set(c);else if(r.c=='merge')hs.set(merge(c,l));else up();cloud.status='সেভ আছে ✓'})}
  catch(e){ready=false;st('অফলাইন: নেট এলে ক্লাউডের সাথে মিলবে')}
}
window.addEventListener('online',()=>{if(cur&&!ready)load()});
window.onSave=()=>{if(!ready)return;clearTimeout(timer);st('সেভ হচ্ছে…');
  timer=setTimeout(async()=>{try{await up();st('সেভ আছে ✓')}catch(e){st('নেট এলে সেভ হবে')}},700)};
onAuthStateChanged(auth,async u=>{cur=u;cloud.user=u;
  if(!u){ref=null;ready=false;cloud.status='';render();return}
  ref=doc(db,'users',u.uid);await load();render()});
}catch(e){window.cloud={on:false}}}
