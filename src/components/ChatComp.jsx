import { useState } from 'react'

const ChatComp = (props) => {
  const [uiFolderPath, setUiFolderPath] = useState('');
  const [uittt, setuittt] = useState('');
  
  const onFolderPathChanged = (event) => {
    //if we didnd't already have the "fileInput" var in scope, we could use "event.target" to get it
    // if(fileInput.files.length>=1) {
    //   //In this example, I'm putting the selected file's name in the title. You don't need to do this
    //   document.title = fileInput.files[0].name;
    //   downloadAnchor.setAttribute("download","edited_"+fileInput.files[0].name);
    // }
    // else {
    //     document.title = "FileReader Example";
    //     downloadAnchor.setAttribute("download","edited_file.txt");
    // }
    setUiFolderPath(event.target.value);
    var fr = new FileReader();
    fr.readAsText(uiFolderPath);
    fr.onload = function (event) {
        setuittt(event.target.result);
        
    }
  }

  const onOpenChatClicked = async (event) => {
    const folderHandler = await window.showDirectoryPicker();
    // for await (const entry of dirHandle.values()) {
    //   if (entry.kind === "file"){
    //     const file = await entry.getFile();
    //     const text = await file.text();
    //     console.log(text);
    //   }
    //   if (entry.kind === "directory"){
    //     /* for file in this directory do something */ 
    //   }
    // }
  }

  return (
    <div>
      <h1>Chat history</h1>
      <button onClick={onOpenChatClicked}>Open Chat</button>
      <input id="fileInput" 
        type="file" 
        value={uiFolderPath}
        onChange={onFolderPathChanged}
      />
      <textarea value={uittt}></textarea>
    </div>
  )
}

export default ChatComp;