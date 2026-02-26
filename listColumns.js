import { Pool } from 'pg';
(async ()=>{
 const pool=new Pool({connectionString:'postgresql://postgres:root@localhost:5433/application_db'});
 const tables=['permissions','enterprises','users','roles','user_roles','role_permissions','audit_logs','user_sessions','login_history','otp_verifications','role_page_permissions','pages','user_files','field_configurations'];
 for(const t of tables){
   const res=await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name=$1;`,[t]);
   console.log(t, res.rows.map(r=>r.column_name));
 }
 await pool.end();
})();