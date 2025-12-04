import { getLocaleID } from "../utils/locale";

const chatsByItem: Record<number, string[]> = {};

export class ChatPaneSection {
  static register() {
    Zotero.ItemPaneManager.registerSection({
      paneID: "chat",
      pluginID: addon.data.config.addonID,

      header: {
        l10nID: getLocaleID("item-section-chat-head-text"),
        icon: "chrome://zotero/skin/20/universal/save.svg",
      },

      sidenav: {
        l10nID: getLocaleID("item-section-chat-sidenav-tooltip"),
        icon: "chrome://zotero/skin/20/universal/save.svg",
      },

      onRender: ({ body, item }) => {
        body.textContent = "";

        (body as HTMLElement).style.display = "flex";
        (body as HTMLElement).style.flexDirection = "column";
        (body as HTMLElement).style.minHeight = "150px"; // give it some space

        if (!item) {
          body.textContent = "Select an item to start chatting.";
          return;
        }

        // Doc is a document that "owns" a body. It is the main docmunt that defines the pane.
        const doc = body.ownerDocument!; // tell TS this is not null

        const itemID = item.id as number;
        if (!chatsByItem[itemID]) {
          chatsByItem[itemID] = [];
        }

        const container = doc.createElement("div");
        container.style.display = "flex";
        container.style.flexDirection = "column";
        container.style.flex = "1";          // use all vertical space
        container.style.gap = "4px";
        container.style.border = "1px solid red";

        const messagesBox = doc.createElement("div");
        messagesBox.style.flex = "1";          // takes remaining height
        messagesBox.style.minHeight = "60px";  // don’t collapse completely
        messagesBox.style.overflowY = "auto";
        messagesBox.style.border = "1px solid blue";
        messagesBox.style.padding = "4px";
        messagesBox.style.fontSize = "0.9em";
        messagesBox.style.background = "rgba(0,0,0,0.02)";

        const renderMessages = () => {
          messagesBox.textContent = "";
          for (const msg of chatsByItem[itemID]) {
            const p = doc.createElement("div");
            p.textContent = msg;
            p.style.marginBottom = "2px";
            messagesBox.appendChild(p);
          }
          messagesBox.scrollTop = messagesBox.scrollHeight;
        };
        renderMessages();

        const inputRow = doc.createElement("div");
        inputRow.style.display = "flex";
        inputRow.style.gap = "4px";
        inputRow.style.marginTop = "4px";
        inputRow.style.border = "1px solid green";
        inputRow.style.alignItems = "center";

        // Use HTML input instead of <textbox>
        const input = doc.createElement("input") as HTMLInputElement;
        input.type = "text";
        input.placeholder = `Chat about: ${item.getField("title")}`;
        input.style.flex = "1";          // takes remaining width
        input.style.minWidth = "0";      // allow shrinking inside flex

        // Use HTML button
        const sendButton = doc.createElement("button") as HTMLButtonElement;
        sendButton.textContent = "Send";

        const send = () => {
          const text = input.value.trim();
          if (!text) return;
          chatsByItem[itemID].push(text);
          input.value = "";
          renderMessages();
        };

        sendButton.addEventListener("click", send);
        input.addEventListener("keydown", (ev: KeyboardEvent) => {
          if (ev.key === "Enter") {
            ev.preventDefault();
            send();
          }
        });

        inputRow.appendChild(input);
        inputRow.appendChild(sendButton);

        container.appendChild(messagesBox);
        container.appendChild(inputRow);
        body.appendChild(container);
      },
    });
  }
}