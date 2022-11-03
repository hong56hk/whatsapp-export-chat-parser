const moment = require("moment");

const Formatter = {}


Formatter.parseUnxiTime = (u, f="YYYY/MM/DD hh:mm:ss") => {
 return moment.unix(u/1000).format(f); 
}

Formatter.formatDateTime = (t, org_f="YYYY-MM-DDThh:mm:ss.SSSZ", to_f="YYYY/MM/DD hh:mm:ss") => {
  let m =  moment(t, org_f, false);
  return m.format(to_f); 
}
Formatter.formatDate = (t, org_f="YYYY-MM-DDThh:mm:ss.SSSZ", to_f="YYYY/MM/DD") => {
  let m =  moment(t, org_f, false);
  return m.format(to_f); 
}

export default Formatter;