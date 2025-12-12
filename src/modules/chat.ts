import { getLocaleID } from "../utils/locale";
import { config } from "../../package.json";

type ChatEntry = { text: string; from: "me" | "other" };
const chatsByItem: Record<number, ChatEntry[]> = {};

let paneKey = "";

export class ChatPaneSection {
  static registerChatPaneSection() {
    const key = Zotero.ItemPaneManager.registerSection({
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
      onRender,
      sectionButtons: [
        {
          type: "fullHeight",
          icon: `chrome://${config.addonRef}/content/icons/full-16.svg`,
          l10nID: getLocaleID("item-section-chat-fullHeight"),
          onClick: ({ body }) => {
            const details = body.closest("item-details");
            onUpdateHeight({ body });
            // @ts-expect-error 'item-details' is a custom element on Zotero
            details.scrollToPane(paneKey);
          },
        },
      ],
    });
    if (key) paneKey = key;
  }
}

function onRender({ body, item }: { body: HTMLElement; item: Zotero.Item }) {
  body.textContent = "";

  // Doc is a document that "owns" a body. It is the main docmunt that defines the pane.
  const doc = body.ownerDocument!; // tell TS this is not null
  // Injecting CSS file
  if (!doc.querySelector(`link[href*="chatWindow.css"]`)) {
    const link = doc.createElement("link");
    link.rel = "stylesheet";
    link.href = `chrome://${config.addonRef}/content/chatWindow.css`;
    doc.documentElement?.appendChild(link);
  }

  body.style.display = "flex";
  body.style.flexDirection = "column";
  body.style.minHeight = "150px"; // give it some space

  if (!item) {
    body.textContent = "Select an item to start chatting.";
    return;
  }

  const itemID = item.id as number;
  if (!chatsByItem[itemID]) {
    chatsByItem[itemID] = [];
  }

  const container = doc.createElement("div");
  container.className = "chat-pane";
  container.style.flex = "1"; // fill available height from Zotero pane

  const messagesBox = doc.createElement("div");
  messagesBox.className = "chat-pane__messages";

  // Prevent scroll from bubbling to parent pane
  messagesBox.addEventListener(
    "wheel",
    (e: WheelEvent) => {
      const atTop = messagesBox.scrollTop === 0;
      const atBottom =
        messagesBox.scrollTop + messagesBox.clientHeight >=
        messagesBox.scrollHeight;

      // Only stop propagation if we're actually scrolling within bounds
      if ((e.deltaY < 0 && !atTop) || (e.deltaY > 0 && !atBottom)) {
        e.stopPropagation();
      }
    },
    { passive: false },
  );

  const renderMessages = () => {
    messagesBox.textContent = "";
    if (!chatsByItem[itemID].length) {
      const empty = doc.createElement("div");
      empty.className = "chat-pane__empty";
      empty.textContent = "No messages yet.";
      messagesBox.appendChild(empty);
      return;
    }
    for (const msg of chatsByItem[itemID]) {
      const p = doc.createElement("div");
      p.textContent = msg.text;
      p.className = `chat-pane__message chat-pane__message--${msg.from}`;
      messagesBox.appendChild(p);
    }
    messagesBox.scrollTop = messagesBox.scrollHeight;
  };
  renderMessages();

  // Outer container for input area
  const inputArea = doc.createElement("div");
  inputArea.className = "chat-pane__input-area";

  const modelSelect = doc.createElement("select");
  modelSelect.className = "chat-pane__model-select";
  ["Claude 4.5", "Claude 3.7", "GPT-4o", "GPT-3.5"].forEach((label) => {
    const opt = doc.createElement("option");
    opt.value = label;
    opt.textContent = label;
    modelSelect.appendChild(opt);
  });
  modelSelect.value = "Claude 4.5";

  // Inner wrapper for input + send icon
  const inputWrapper = doc.createElement("div");
  inputWrapper.className = "chat-pane__input-wrapper";

  // Use textarea for multiline input
  const input = doc.createElement("textarea") as HTMLTextAreaElement;
  input.placeholder = `Explore and understand the paper`;
  input.className = "chat-pane__input";
  input.rows = 2;

  // Use icon button
  const sendButton = doc.createElement("button") as HTMLButtonElement;
  sendButton.className = "chat-pane__send";
  sendButton.setAttribute("aria-label", "Send message");
  const sendIcon = doc.createElement("img");
  sendIcon.src = `chrome://${config.addonRef}/content/icons/Send.png`;
  sendIcon.alt = "Send";
  sendIcon.className = "chat-pane__send-icon";
  sendButton.appendChild(sendIcon);

  const updateSendState = () => {
    sendButton.disabled = !input.value.trim();
  };

  const send = () => {
    const text = input.value.trim();
    if (!text) return;
    chatsByItem[itemID].push({ text, from: "me" });
    // Echo back as if from other party
    chatsByItem[itemID].push({ text, from: "other" });
    input.value = "";
    renderMessages();
    updateSendState();
  };

  sendButton.addEventListener("click", send);
  input.addEventListener("keydown", (ev: KeyboardEvent) => {
    // Enter sends, Shift+Enter inserts newline
    if (ev.key === "Enter" && !ev.shiftKey) {
      ev.preventDefault();
      send();
    }
  });
  input.addEventListener("input", updateSendState);
  updateSendState();

  // Build hierarchy: input wrapper contains input + send button
  inputWrapper.appendChild(modelSelect);
  inputWrapper.appendChild(sendButton);

  // Input area contains input wrapper, then model select below
  inputArea.appendChild(input);
  inputArea.appendChild(inputWrapper);

  // Main container holds messages + input area
  container.appendChild(messagesBox);
  container.appendChild(inputArea);
  body.appendChild(container);

  // Add resize listener
  const handleResize = () => {
    onUpdateHeight({ body });
  };

  const win = doc.defaultView;
  win?.addEventListener("resize", handleResize);

  // Cleanup on re-render (optional, prevents duplicate listeners)
  const observer = new MutationObserver(() => {
    win?.removeEventListener("resize", handleResize);
  });
  observer.observe(body, { childList: true });
}

function onUpdateHeight({ body }: { body: HTMLElement }) {
  const details = body.closest("item-details");
  const head = body.closest("item-pane-custom-section")?.querySelector(".head");

  body.style.height = `${details!.querySelector(".zotero-view-item")!.clientHeight - head!.clientHeight - 8}px`;
}
