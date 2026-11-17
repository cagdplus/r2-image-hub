export const FOLDER_CLIENT = String.raw`
  function runFolderOperation(payload) {
    modal('管理文件夹','<div class="form-stack"><strong id="folderProgress">操作进行中，请勿关闭页面</strong><div class="share-meta" id="folderPhase"></div><button class="btn" id="folderRetry" hidden>继续操作</button></div>');
    var progress=document.getElementById('folderProgress'),phase=document.getElementById('folderPhase');
    var retry=document.getElementById('folderRetry'),close=document.getElementById('modalClose');
    var current=payload;
    async function execute(){
      retry.hidden=true;close.disabled=true;
      try {
        while(true){
          var result=await api('folder',{method:'POST',body:JSON.stringify(current)});
          var labels={scan:'扫描文件',copy:'复制文件',shares:'更新分享链接',remove:'清理原目录',done:'操作完成'};
          progress.textContent=tr(labels[result.phase]||'操作进行中，请勿关闭页面');
          phase.textContent=(result.copied||result.deleted||0)+' / '+result.total;
          if(result.done){
            localStorage.removeItem('r2-gallery-folder-operation');
            close.disabled=false;
            var destination=result.action==='move'?result.toDir:result.fromDir.split('/').slice(0,-1).join('/');
            location.href='/'+destination.split('/').filter(Boolean).map(encodeURIComponent).join('/')+(destination?'/':'');
            return;
          }
          current={jobId:result.jobId};
          localStorage.setItem('r2-gallery-folder-operation',JSON.stringify(current));
        }
      } catch(error){
        close.disabled=false;
        progress.textContent=tr(error.message);
        retry.hidden=false;
      }
    }
    retry.onclick=execute;
    execute();
  }
  function openFolderManagement(folder){
    var name=folder.split('/').pop();
    modal('管理文件夹','<div class="form-stack"><div data-user-content style="overflow-wrap:anywhere">/'+esc(folder)+'</div><div class="folder-actions"><button class="btn" id="folderRename">重命名文件夹</button><button class="btn" id="folderMove">移动文件夹</button><button class="btn btn-danger" id="folderDelete">删除文件夹</button></div></div>');
    function destinationForm(rename){
      modal(rename?'重命名文件夹':'移动文件夹','<div class="form-stack"><label><span class="form-label">'+(rename?'新文件夹名称':'目标父文件夹')+'</span><input class="field" id="folderDestination" value="'+esc(rename?name:'')+'" placeholder="'+(rename?'新文件夹名称':'留空表示根目录')+'"></label><div class="form-row" style="justify-content:flex-end"><button class="btn" id="folderCancel">取消</button><button class="btn btn-primary" id="folderConfirm">确认</button></div></div>');
      document.getElementById('folderCancel').onclick=closeModal;
      document.getElementById('folderConfirm').onclick=function(){
        var value=document.getElementById('folderDestination').value.trim().replace(/^\/+|\/+$/g,'');
        if(rename&&(!value||value.indexOf('/')>=0)){toast('请输入有效的单级文件夹名称',true);return;}
        var parent=folder.split('/').slice(0,-1).join('/');
        var target=rename?(parent?parent+'/':'')+value:(value?value+'/':'')+name;
        runFolderOperation({action:'move',fromDir:folder,toDir:target});
      };
      document.getElementById('folderDestination').focus();
    }
    document.getElementById('folderRename').onclick=function(){destinationForm(true);};
    document.getElementById('folderMove').onclick=function(){destinationForm(false);};
    document.getElementById('folderDelete').onclick=function(){
      modal('删除文件夹','<div class="form-stack"><p class="status expired">这会递归删除文件夹及其中所有文件，无法撤销。</p><div data-user-content style="overflow-wrap:anywhere">/'+esc(folder)+'</div><label><span class="form-label">确认删除路径</span><input class="field" id="folderDeleteConfirm" autocomplete="off"></label><div class="form-row" style="justify-content:flex-end"><button class="btn" id="folderDeleteCancel">取消</button><button class="btn btn-danger" id="folderDeleteNow">删除文件夹</button></div></div>');
      document.getElementById('folderDeleteCancel').onclick=closeModal;
      document.getElementById('folderDeleteNow').onclick=function(){
        var value=document.getElementById('folderDeleteConfirm').value.trim().replace(/^\/+|\/+$/g,'');
        if(value!==folder){toast('请完整输入要删除的文件夹路径',true);return;}
        runFolderOperation({action:'delete',fromDir:folder,confirmPath:value});
      };
    };
  }
  if(isAdmin){
    document.querySelectorAll('[data-folder-manage]').forEach(function(button){
      button.onclick=function(e){e.preventDefault();e.stopPropagation();openFolderManagement(button.dataset.folderManage);};
    });
    var pending=localStorage.getItem('r2-gallery-folder-operation');
    if(pending){
      try{var job=JSON.parse(pending);modal('管理文件夹','<div class="form-stack"><div>有未完成的文件夹操作</div><button class="btn btn-primary" id="resumeFolderOperation">继续操作</button></div>');document.getElementById('resumeFolderOperation').onclick=function(){runFolderOperation(job);};}catch(e){}
    }
  }
`;
