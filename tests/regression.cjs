const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { build } = require('esbuild');
const { Miniflare } = require('miniflare');
const { chromium } = require('playwright-core');

(async () => {
  await build({ entryPoints: ['src/index.ts'], bundle: true, format: 'esm', outfile: '.wrangler/test-worker.mjs', platform: 'browser' });
  const mf = new Miniflare({ modules: true, scriptPath: '.wrangler/test-worker.mjs',
    compatibilityDate: '2022-05-15', compatibilityFlags: ['r2_list_honor_include','streams_enable_constructors'],
    r2Buckets: ['R2_BUCKET'], bindings: { ADMIN_USERNAME: 'admin', ADMIN_PASSWORD: 'isolated-test-password-only',
      LOGGING: false, DIRECTORY_LISTING: true, HIDE_HIDDEN_FILES: true }, cache: false });
  let browser;
  const results = [];
  function check(name, condition) { assert.ok(condition, name); results.push(name); }
  const bucket = await mf.getR2Bucket('R2_BUCKET');
  const base = (await mf.ready).origin;
  let cookie = '';
  const request = (url, options = {}, auth = true) => fetch(base + url, {
    ...options, redirect:'manual', headers: { ...(auth && cookie ? { cookie } : {}), ...options.headers },
  });
  const post = async (url, body, auth = true) => {
    const r = await request('/_gallery/api/' + url, { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify(body) }, auth);
    const d = await r.json(); return { status: r.status, ...d };
  };
  async function job(payload) {
    let result = await post('folder', payload), steps = 0;
    assert.equal(result.status, 200, JSON.stringify(result));
    while (!result.done) {
      assert.ok(++steps < 2000, 'operation terminates');
      result = await post('folder', { jobId: result.jobId });
      assert.equal(result.status, 200, JSON.stringify(result));
    }
    return result;
  }
  try {
    const login = await request('/_gallery/api/login', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'admin',password:'isolated-test-password-only'})}, false);
    cookie = login.headers.get('set-cookie').split(';')[0];
    check('Administrator authentication', login.status === 200);
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 650"><rect width="500" height="650" fill="#637d53"/><circle cx="360" cy="165" r="63" fill="#e3d8aa"/><path d="M0 500 180 270 330 460 500 350V650H0Z" fill="#293d34"/></svg>';
    for (let i=1;i<=8;i++) await bucket.put(`相册/photo${i}.svg`,svg,{httpMetadata:{contentType:'image/svg+xml'}});
    await bucket.put('相册/子目录/note.txt','child');
    await bucket.put('pic/image.png','test-content',{httpMetadata:{contentType:'image/png'}});
    await bucket.put('legacy/',new Uint8Array(0),{httpMetadata:{contentType:'application/x-directory'}});
    await bucket.put('.r2-explorer/gallery-config.json',JSON.stringify({...await(await bucket.get('.r2-explorer/gallery-config.json')).json(),hiddenDirs:['相册/子目录']}));
    await bucket.put('.r2-explorer/sharable-links/existing.json',JSON.stringify({key:'相册/子目录/note.txt',bucket:'R2_BUCKET',createdAt:1,currentDownloads:0,createdBy:'admin'}));
    check('Unauthenticated folder mutation denied', (await post('folder',{action:'delete',fromDir:'相册',confirmPath:'相册'},false)).status===401);
    check('Protected root cannot be deleted', (await post('folder',{action:'delete',fromDir:'.r2-explorer',confirmPath:'.r2-explorer'})).status===400);
    check('Folder deletion requires typed confirmation', (await post('folder',{action:'delete',fromDir:'相册',confirmPath:'wrong'})).status===400);
    await post('mkdir',{path:'empty'});
    let r=await request('/empty/',{},false);
    check('New empty folder serves HTML to visitors',r.status===200 && r.headers.get('content-type').includes('text/html'));
    r=await request('/legacy/',{},false);
    check('Legacy zero-byte directory marker serves gallery, not a download',r.status===200 && r.headers.get('content-type').includes('text/html') && !r.headers.get('content-disposition'));
    await bucket.put('existing/file.txt','must-survive');
    check('Move refuses existing destination', (await post('folder',{fromDir:'相册',toDir:'existing'})).status===409);
    check('Move refuses self descendants', (await post('folder',{fromDir:'相册',toDir:'相册/inside'})).status===400);
    const renamed=await job({action:'move',fromDir:'相册',toDir:'改名相册'});
    check('Recursive folder rename copies and verifies all objects',renamed.copied===9 && !(await bucket.head('相册/photo1.svg')) && !!(await bucket.head('改名相册/photo1.svg')));
    let cfg=await (await bucket.get('.r2-explorer/gallery-config.json')).json();
    check('Rename remaps hidden-folder configuration',cfg.hiddenDirs.includes('改名相册/子目录'));
    let share=await (await bucket.get('.r2-explorer/sharable-links/existing.json')).json();
    check('Rename keeps shared links working by remapping their target',share.key==='改名相册/子目录/note.txt');
    const moved=await job({action:'move',fromDir:'改名相册',toDir:'目标/改名相册'});
    check('Move includes nested folders',moved.copied===9 && !!(await bucket.head('目标/改名相册/子目录/note.txt')));
    const removed=await job({action:'delete',fromDir:'目标/改名相册',confirmPath:'目标/改名相册'});
    check('Recursive delete removes every selected-folder object',removed.deleted===9 && (await bucket.list({prefix:'目标/改名相册/'})).objects.length===0);
    cfg=await (await bucket.get('.r2-explorer/gallery-config.json')).json();
    check('Delete removes only relevant visibility settings',cfg.hiddenDirs.length===0 && (await bucket.get('existing/file.txt')).size===12);
    await job({action:'delete',fromDir:'empty',confirmPath:'empty'});
    check('Empty-folder deletion removes its placeholder',!(await bucket.head('empty/.keep')));
    r=await request('/pic/image.png',{headers:{range:'bytes=0-3'}},false);
    check('Original Range semantics preserved',r.status===206);

    // Pagination regression: delete more than one R2 list page without skipping keys.
    for (let n=0;n<1003;n+=64) await Promise.all(Array.from({length:Math.min(64,1003-n)},(_,i)=>bucket.put('many/'+String(n+i).padStart(5,'0')+'.txt','x')));
    const largeDelete=await job({action:'delete',fromDir:'many',confirmPath:'many'});
    check('Recursive delete handles more than 1000 objects without skipping pages',largeDelete.total===1003 && largeDelete.deleted===1003 && (await bucket.list({prefix:'many/'})).objects.length===0);
    // Copy failures must leave originals intact, never overwrite a destination.
    await bucket.put('conflict-source/a.txt','source');
    let conflict=await post('folder',{action:'move',fromDir:'conflict-source',toDir:'conflict-target'});
    conflict=await post('folder',{jobId:conflict.jobId});
    await bucket.put('conflict-target/a.txt','different');
    conflict=await post('folder',{jobId:conflict.jobId});
    check('Mid-operation destination conflict preserves source and destination',conflict.status===409 && await(await bucket.get('conflict-source/a.txt')).text()==='source' && await(await bucket.get('conflict-target/a.txt')).text()==='different');

    // Fresh isolated browser fixtures; production R2 is never used by these tests.
    for (let i=1;i<=8;i++) await bucket.put(`预览相册/photo${i}.svg`,svg,{httpMetadata:{contentType:'image/svg+xml'}});
    await bucket.put('预览相册/子相册/.keep','');
    browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium-browser',args:['--no-sandbox']});
    const context=await browser.newContext({viewport:{width:1360,height:880},serviceWorkers:'block'});
    await context.route('**/*',async route=>{
      const req=route.request();
      if(!req.url().startsWith(base+'/')) return route.abort();
      try {
        const res=await fetch(req.url(),{method:req.method(),headers:req.headers(),body:req.postDataBuffer()||undefined});
        const headers=Object.fromEntries(res.headers);
        delete headers['content-encoding'];delete headers['content-length'];
        await route.fulfill({status:res.status,headers,body:Buffer.from(await res.arrayBuffer())});
      }catch(e){await route.abort();}
    });
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+'/'+encodeURIComponent('预览相册')+'/');
    await page.waitForFunction(()=>[...document.images].every(im=>im.complete));
    for(const script of await page.locator('script').allTextContents()) new vm.Script(script);
    check('No login prompt appears for visitors',!await page.locator('#modal').evaluate(e=>e.classList.contains('open')));
    await page.locator('.img-cell').first().click();
    check('Visitors can open the lightbox',await page.locator('#lightbox').evaluate(e=>e.classList.contains('open')));
    await page.keyboard.press('ArrowRight');
    check('Guest keyboard image navigation preserved',(await page.locator('#lightboxCaption').textContent()).startsWith('2 /'));
    await page.keyboard.press('Escape');
    await page.locator('#filter').fill('photo3');
    check('Guest filename filter preserved',await page.locator('.img-cell:visible').count()===1);
    await page.locator('#filter').fill('');
    const screenDir=process.env.SCREENSHOT_DIR||'.wrangler/screenshots';fs.mkdirSync(screenDir,{recursive:true});
    await page.screenshot({path:path.join(screenDir,'gallery-v4-zh.png')});
    await page.locator('#languageTrigger').click();await page.locator('[data-language="en"]').click();
    check('English menu and page labels translate',await page.locator('html').getAttribute('lang')==='en' && (await page.locator('.gallery-footer').innerText()).includes('For personal collection'));
    check('User folder names are not translated',(await page.locator('.crumbs').innerText()).includes('预览相册'));
    await page.reload();
    check('Language preference survives reload',await page.locator('html').getAttribute('lang')==='en');
    await page.screenshot({path:path.join(screenDir,'gallery-v4-en.png')});
    await page.locator('#loginOpen').click();await page.locator('#loginPass').fill('isolated-test-password-only');
    await page.locator('#doLogin').click();await page.locator('#logoutBtn').waitFor();
    check('Avatar sign-in entry opens administrator tools',await page.locator('[data-folder-manage]').count()===1);
    await page.locator('[data-folder-manage]').first().click();
    check('Folder manager offers rename, move and delete',await page.locator('#folderRename').innerText()==='Rename folder' && await page.locator('#folderDelete').innerText()==='Delete folder');
    await page.screenshot({path:path.join(screenDir,'gallery-v4-folder-menu.png')});
    await page.locator('#folderRename').click();await page.locator('#folderDestination').fill('Renamed folder');
    await page.locator('#folderConfirm').click();await page.waitForURL('**/Renamed%20folder/');
    check('Browser folder rename completes through the real API',!!await bucket.head('预览相册/Renamed folder/.keep'));
    await page.goto(base+'/'+encodeURIComponent('预览相册')+'/');
    await page.locator('#languageTrigger').click();await page.locator('[data-language="zh-CN"]').click();
    await page.locator('.select-mark').first().click();
    await page.screenshot({path:path.join(screenDir,'gallery-v4-admin.png')});
    for(const width of [320,390,768,1360]){
      await page.setViewportSize({width,height:880});
      check('No horizontal overflow at '+width+'px',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    }
    await page.setViewportSize({width:390,height:844});
    await page.screenshot({path:path.join(screenDir,'gallery-v4-mobile.png')});
    check('Browser has no JavaScript errors',errors.length===0);
    fs.writeFileSync('.wrangler/test-results.json',JSON.stringify({passed:results.length,checks:results},null,2));
    console.log(JSON.stringify({passed:results.length,checks:results},null,2));
  } finally {if(browser) await browser.close();await mf.dispose();}
})().catch(e=>{console.error(e);process.exitCode=1;});
