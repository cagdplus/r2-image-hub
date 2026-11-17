// UI-only translation: file keys, names, user inputs and image URLs are never rewritten.
export const I18N_CLIENT = String.raw`
  var galleryLanguage = 'zh-CN';
  try { galleryLanguage = localStorage.getItem('r2-gallery-language') === 'en' ? 'en' : 'zh-CN'; } catch(e) {}
  var messages = {
    'R2 画廊': 'R2 Gallery',
    'R2 画廊 · 图片直链仅供个人收藏欣赏': 'R2 Gallery · For personal collection & viewing only',
    '根目录':'Home','空目录':'Empty folder','文件夹':'Folders','图片':'Images','其他文件':'Other files',
    '这个文件夹还没有内容':'This folder is empty','文件':'Files','隐藏':'Hidden',
    '经典榄绿':'Classic Olive','简约浅色':'Light','深色模式':'Dark',
    '切换皮肤':'Appearance','切换语言':'Language','快捷操作':'Quick actions',
    '管理员模式入口':'Administrator sign-in','退出管理员模式':'Exit administrator mode',
    '上传文件':'Upload files','上传文件到当前目录':'Upload files to this folder',
    '新建文件夹':'New folder','分享短链管理':'Manage shared links',
    '目录展示设置':'Folder visibility','目录展示设置（隐藏/公开）':'Folder visibility (hidden/public)',
    '返回上一级':'Parent folder','当前路径':'Current path',
    '隐藏此目录':'Hide this folder','已隐藏 · 点击恢复':'Hidden · Click to show',
    '控制该文件夹是否在访客画廊展示':'Control whether visitors can browse this folder',
    '不在公开画廊展示':'Hidden from the public gallery','筛选本目录…':'Filter this folder…',
    '管理文件夹':'Manage folder','重命名文件夹':'Rename folder','移动文件夹':'Move folder',
    '删除文件夹':'Delete folder','文件夹名称':'Folder name',
    '新文件夹名称':'New folder name','新路径':'New path',
    '目标父文件夹':'Destination parent folder','留空表示根目录':'Leave empty for the root folder',
    '目标文件夹路径（可直接输入新路径）':'Destination folder path (a new path is allowed)',
    '根目录可留空':'Leave empty for root','例如：2026-相册':'e.g. 2026-album',
    '请输入有效的单级文件夹名称':'Enter a valid single-level folder name',
    '请填写文件夹路径':'Enter a folder path','文件夹已创建':'Folder created',
    '确认删除路径':'Type the full folder path to confirm',
    '这会递归删除文件夹及其中所有文件，无法撤销。':'This permanently deletes the folder and all files inside it.',
    '操作进行中，请勿关闭页面':'Working. Please keep this page open.',
    '扫描文件':'Scanning files','复制文件':'Copying files','更新分享链接':'Updating shared links',
    '清理原目录':'Removing source folder','操作完成':'Operation completed','继续操作':'Continue operation','有未完成的文件夹操作':'An unfinished folder operation is available',
    '取消':'Cancel','关闭':'Close','创建':'Create','确认':'Confirm','保存设置':'Save changes',
    '全选':'Select all','下载 ZIP':'Download ZIP','复制到':'Copy to','移动到':'Move to','删除':'Delete','重命名':'Rename',
    '生成短链':'Create short link','生成短链分享':'Create a short shared link','分享':'Share',
    '上一张':'Previous image','下一张':'Next image','查看原图 ↗':'Open original ↗','加载更多 ↓':'Load more ↓',
    '勾选/取消勾选':'Select / deselect','生成图片分享短链':'Create a short image link',
    '目标文件':'File','有效期':'Expires in','1 小时':'1 hour','1 天':'1 day','7 天':'7 days','30 天':'30 days','永久有效':'Never expires',
    '分享短链已生成':'Short link created','复制链接':'Copy link','短链已复制':'Short link copied',
    '链接已复制':'Link copied','分享链接状态与有效期管理':'Shared links & expiration',
    '长期有效（可在后台随时调整或撤销）':'No expiry. You can change or revoke it at any time.',
    '有效':'Active','已过期':'Expired','暂无分享链接':'No shared links yet',
    '调整有效期…':'Change expiration…','设为 1 小时后到期':'Expire in 1 hour','设为 1 天后到期':'Expire in 1 day',
    '设为 7 天后到期':'Expire in 7 days','设为 30 天后到期':'Expire in 30 days','设为永久有效':'Never expire',
    '撤销':'Revoke','有效期已更新':'Expiration updated','已撤销':'Revoked',
    '确定撤销这条分享链接？':'Revoke this shared link?',
    '要退出管理员模式吗？':'Exit administrator mode?',
    '画廊目录展示设置':'Gallery folder visibility','当前层级没有子文件夹':'No subfolders here',
    '勾选表示在公开画廊展示；取消勾选则对访客隐藏（知道原图直链仍可正常通过 render 分发）。':'Checked folders are visible in the public gallery. Unchecked folders are hidden; original file URLs remain accessible.',
    '目录展示设置已保存':'Folder visibility saved','目录展示状态已更新':'Folder visibility updated',
    '开启管理员模式':'Administrator sign-in','管理员账号':'Username','密码':'Password',
    '请输入管理员密码':'Enter your administrator password','进入管理模式':'Sign in',
    '管理员账号或密码错误':'Incorrect username or password','未登录或管理员会话已过期':'Sign in again to continue',
    '请勾选 1 张图片生成分享短链':'Select one image to create a short link',
    '复制到文件夹':'Copy to folder','移动到文件夹':'Move to folder','下载失败':'Download failed',
    '非法文件夹路径':'Invalid folder path','请输入有效文件夹路径':'Enter a valid folder path',
    '请完整输入要删除的文件夹路径':'Type the full folder path to confirm deletion',
    '源目录与目标目录不能相同或相互包含':'Source and destination cannot be the same or contain one another',
    '文件夹不存在':'Folder not found','目标文件夹已存在，请使用新路径':'Destination already exists. Choose a new path.',
    '源文件已变化，已暂停且保留源文件':'A source file changed. The operation stopped and source files were retained.',
    '目标存在不同文件，停止以避免覆盖':'A different destination file exists. Stopped to prevent overwriting.',
    '目标文件校验失败，源文件已保留':'Destination verification failed. Source files were retained.',
    '源文件已变化，停止删除以保护新内容':'A source file changed. Deletion stopped to protect it.',
    '操作期间目录新增了文件，新增文件已保留，请刷新后重试':'New files appeared during the operation. They were retained. Refresh and try again.',
    '文件夹操作失败，源文件已保留':'Folder operation failed. Source files were retained.',
    '非法任务编号':'Invalid operation ID','任务不存在':'Operation not found','无权操作此任务':'Not authorized for this operation',
    '目标文件已存在，请先改名或删除原文件':'File already exists. Rename it or remove the original first.',
    '管理员密码尚未设置，请先配置 ADMIN_PASSWORD':'Administrator password is not configured',
    '请求格式错误':'Invalid request','跨站请求被拒绝':'Cross-site request blocked',
    '未知管理接口':'Unknown management endpoint','单次最多下载 500 个文件':'Select up to 500 files per download',
    '未选择文件':'No files selected','未选择要删除的文件':'No files selected for deletion','未选择要操作的文件':'No files selected',
    '非法文件路径':'Invalid file path','未找到该分享链接':'Shared link not found'
  };
  function tr(value) {
    if (galleryLanguage !== 'en' || typeof value !== 'string') return value;
    var lead = (value.match(/^\s*/) || [''])[0], tail = (value.match(/\s*$/) || [''])[0], s = value.trim();
    if (!s) return value;
    if (messages[s]) return lead + messages[s] + tail;
    s = s.replace(/确定删除选中的 (\d+) 个文件？此操作不可撤销。/, 'Permanently delete $1 selected files? This cannot be undone.')
      .replace(/^(\d+) 项已选$/, '$1 selected')
      .replace(/^(\d+) 张$/, '$1 images')
      .replace(/(\d+) 个文件夹/g, '$1 folders').replace(/(\d+) 张图片/g, '$1 images').replace(/(\d+) 个文件/g, '$1 files')
      .replace(/^(移动|复制)完成：(\d+) 项$/, function(_,a,n){return (a==='移动'?'Moved ':'Copied ')+n+' items';})
      .replace(/^已删除 (\d+) 项$/, 'Deleted $1 items').replace(/^已上传 (\d+) 个文件$/, 'Uploaded $1 files')
      .replace(/^有 (\d+) 个文件上传失败（可能同名已存在）$/, '$1 files failed to upload (a file may already exist)')
      .replace('管理员模式已开启 (', 'Administrator mode active (').replace(') · 点击退出', ') · Click to sign out')
      .replace(/^勾选 /, 'Select ').replace(/^分享 /, 'Share ')
      .replace('有效期至：', 'Expires: ').replace('创建 ', 'Created ').replace(' · 已访问 ', ' · Views: ').replace(' 次', '')
      .replace(' · 到期 ', ' · Expires ').replace(' · 永久有效', ' · Never expires')
      .replace(' · 已过期', ' · Expired').replace(' · 有效', ' · Active');
    return lead + s + tail;
  }
  var originalTexts = new WeakMap(), translatedTexts = new WeakMap(), originalAttrs = new WeakMap();
  function translateUI(root) {
    if (!root) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), node;
    while ((node = walker.nextNode())) {
      var parent = node.parentElement;
      if (!parent || parent.closest('script,style,[data-user-content],input,textarea,[data-language]')) continue;
      if (!originalTexts.has(node) || node.nodeValue !== translatedTexts.get(node)) originalTexts.set(node, node.nodeValue);
      var value = galleryLanguage === 'en' ? tr(originalTexts.get(node)) : originalTexts.get(node);
      if (node.nodeValue !== value) node.nodeValue = value;
      translatedTexts.set(node, value);
    }
    var elements = Array.prototype.slice.call(root.querySelectorAll('[title],[aria-label],[placeholder]'));
    elements.forEach(function(el){
      var attrs = originalAttrs.get(el) || {};
      ['title','aria-label','placeholder'].forEach(function(attr){
        if (!el.hasAttribute(attr)) return;
        if (!(attr in attrs)) attrs[attr] = el.getAttribute(attr);
        var v = galleryLanguage === 'en' ? tr(attrs[attr]) : attrs[attr];
        if (el.getAttribute(attr) !== v) el.setAttribute(attr,v);
      });
      originalAttrs.set(el,attrs);
    });
  }
  function setLanguage(language) {
    galleryLanguage = language === 'en' ? 'en' : 'zh-CN';
    document.documentElement.lang = galleryLanguage;
    try { localStorage.setItem('r2-gallery-language',galleryLanguage); } catch(e) {}
    translateUI(document.body);
    Array.prototype.forEach.call(document.querySelectorAll('[data-language]'),function(b){
      b.classList.toggle('is-active',b.dataset.language===galleryLanguage);
      b.setAttribute('aria-checked',String(b.dataset.language===galleryLanguage));
    });
    document.title = (galleryLanguage === 'en' ? 'R2 Gallery' : 'R2 画廊') + ' — /' + DIR + (DIR?'/':'');
  }
  document.addEventListener('DOMContentLoaded',function(){
    setLanguage(galleryLanguage);
    var trigger=document.getElementById('languageTrigger'),menu=document.getElementById('languageMenu');
    trigger.onclick=function(e){
      e.stopPropagation();
      var open=menu.classList.toggle('open');trigger.setAttribute('aria-expanded',String(open));
      document.getElementById('themeMenu').classList.remove('open');
    };
    document.querySelectorAll('[data-language]').forEach(function(b){b.onclick=function(){setLanguage(b.dataset.language);menu.classList.remove('open');trigger.setAttribute('aria-expanded','false');};});
    document.addEventListener('click',function(e){if(!document.getElementById('languageMenuWrap').contains(e.target)){menu.classList.remove('open');trigger.setAttribute('aria-expanded','false');}});
    document.addEventListener('keydown',function(e){if(e.key==='Escape'){menu.classList.remove('open');document.getElementById('themeMenu').classList.remove('open');}});
    var observer=new MutationObserver(function(records){
      observer.disconnect();translateUI(document.body);
      observer.observe(document.body,{childList:true,subtree:true,characterData:true});
    });
    observer.observe(document.body,{childList:true,subtree:true,characterData:true});
  });
`;
