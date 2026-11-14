require('dotenv').config({path:require('path').join(__dirname,'.env')});
const mongoose=require('mongoose');
async function main(){
  if(!process.env.MONGODB_URI)throw new Error('MISSING_MONGODB_URI');
  await mongoose.connect(process.env.MONGODB_URI,{serverSelectionTimeoutMS:10000,maxPoolSize:5});
  if(['admin','local','config'].includes(mongoose.connection.name))throw new Error('INVALID_APPLICATION_DATABASE');
  console.log(JSON.stringify(await require('./services/admin-demo').install()));
}
main().catch(e=>{console.error('Admin demo setup failed:',e.name);process.exitCode=1;}).finally(()=>mongoose.disconnect());
