import { useState } from 'react'

const ChatComp = (props) => {
  const [uiTitle, setUiTitle] = useState('Chat history');
  const [msgArray, setMsgArray] = useState([]); // array of {time, sender, msg}
  

  const parseChat = (chat) => {
    const pattern = /^\[([1-3]?[0-9]\/1?[0-9]\/[0-9]{4}, 1?[0-9]:[1-6]?[0-9]:[1-6]?[0-9] [AP]M)\] ([\w ]+): ([\w\W]+)/;
    
    const msgarr = [];
    const lines = chat.split("\r\n");
    for( const line of lines) {
      const match = line.match(pattern);
      msgarr.push({
        time: match[1],
        sender: match[2],
        msg: match[3],
      });
    }

    console.log(msgarr);
    return msgarr;
  }

  const onOpenChatClicked = async (event) => {
    const folderHandler = await window.showDirectoryPicker();
    setUiTitle(folderHandler.name + " Chat History");
    
    const fileHandle = await folderHandler.getFileHandle("_chat.txt");
    const txtFile = await fileHandle.getFile(); // API: https://developer.mozilla.org/en-US/docs/Web/API/File
    const chat = await txtFile.text();

    setMsgArray(parseChat(chat));
    
  }

  return (
    <div>
      <h1>{uiTitle}</h1>
      <button onClick={onOpenChatClicked}>Select Chat History Folder</button>
      
      
    </div>
  )
}

export default ChatComp;