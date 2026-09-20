/** Local production preview for Next's /personal_site static export. */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'../out');
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf'};
const port = Number(process.env.PORT || 3001);
http.createServer((request,response)=>{
  try {
    const url = new URL(request.url,'http://localhost');
    if(url.pathname==='/'){response.writeHead(302,{Location:'/personal_site/'});return response.end();}
    if(!url.pathname.startsWith('/personal_site')){response.writeHead(404);return response.end();}
    const relative=decodeURIComponent(url.pathname.slice('/personal_site'.length));
    let file=path.resolve(root,'.'+(relative||'/'));
    if(file!==root&&!file.startsWith(root+path.sep)){response.writeHead(403);return response.end();}
    if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
    if(!fs.existsSync(file)&&fs.existsSync(file+'.html'))file+='.html';
    if(!fs.existsSync(file)){response.writeHead(404);return response.end();}
    response.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});
    fs.createReadStream(file).pipe(response);
  }catch{response.writeHead(400);response.end();}
}).listen(port,'127.0.0.1',()=>console.log(`Production preview: http://127.0.0.1:${port}/personal_site/?perf=1`));
