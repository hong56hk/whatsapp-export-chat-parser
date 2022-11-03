import { useState } from 'react'
import styled from "styled-components";
import Button from '@mui/material/Button';

const moment = require("moment")

const Container = styled.div`
  height: 100%;
  weight: 100%;
`;

const ChatContainer = styled.div`
  height: 100%;
  weight: 100%;
  padding-left: 20px;
  padding-right: 20px;
`;

const MsgDiv = styled.div`
  weight: 100%;
  padding-top: 10px;
  padding-bottom: 10px;
`;


const ChatComp = (props) => {
  let folderHandler = null;

  const [uiTitle, setUiTitle] = useState('Chat history');
  const [msgArray, setMsgArray] = useState([]); // array of {time, sender, msg}
  

  const parseChat = (chat) => {
    const attachmentPattern = /^\u200E\[([1-3]?[0-9]\/1?[0-9]\/[0-9]{4}, 1?[0-9]:[1-6]?[0-9]:[1-6]?[0-9] [AP]M)\] ([\w ]+): \u200E<attached: ([\w\-\.]+)>/;
    const pattern = /^\[([1-3]?[0-9]\/1?[0-9]\/[0-9]{4}, 1?[0-9]:[1-6]?[0-9]:[1-6]?[0-9] [AP]M)\] ([\w ]+): ([\w\W]+)/;
    
    const msgarr = [];
    const lines = chat.split("\r\n");
    for( const line of lines) {
      console.log(line);
      const match = line.match(pattern);
      if (match) {
        msgarr.push({
          type: "msg",
          time: moment(match[1], 'D/M/YYYY, h:m:s a'),
          sender: match[2],
          msg: match[3],
        });
      } else {
        const match = line.match(attachmentPattern);
        if (match) {
          const attach = match[3];
          let attachType = null;

          if (attach.includes("PHOTO")) {
            attachType = "photo";
          } else if (attach.includes("STICKER")) {
            attachType = "sticker";
          }
          msgarr.push({
            type: attachType,
            time: moment(match[1], 'D/M/YYYY, h:m:s a'),
            sender: match[2],
            attachment: match[3],
          });
        } else {
          console.error(`cannot parse this line: ${line}`);
        }
      }
    }

    console.log(msgarr);
    return msgarr;
  }

  const onOpenChatClicked = async (event) => {
    folderHandler = await window.showDirectoryPicker();
    setUiTitle(folderHandler.name + " Chat History");
    
    const fileHandle = await folderHandler.getFileHandle("_chat.txt");
    const txtFile = await fileHandle.getFile(); // API: https://developer.mozilla.org/en-US/docs/Web/API/File
    console.log(txtFile);
    const chat = await txtFile.text();

    setMsgArray(parseChat(chat));
    
  }

  return (
    <Container>

      <h1>{uiTitle}</h1>
      <Button onClick={onOpenChatClicked}>Select Chat History Folder</Button>
      <ChatContainer>
        {msgArray.map((msg, i) => {
          return (
            <MsgDiv key={"msg-" + i}>
              {msg.type === "msg" &&
                <div>
                  {msg.time.format("YYYY/MM/DD hh:mm:ss")} {msg.sender} {msg.msg} {msg.attachment}
                </div>
              }

              {msg.type === "photo" &&
                <div>
                  <img href={msg.attachment} />
                </div>
              }
            </MsgDiv>
          )
        })}
      </ChatContainer>
    </Container>
  )
}

export default ChatComp;