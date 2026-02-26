import { Pool } from 'pg';

(async ()=>{
 const pool=new Pool({connectionString:'postgresql://postgres:root@localhost:5433/application_db'});
 const res=await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public';`);
 console.log(res.rows.map(r=>r.table_name));
 await pool.end();
})();