import { useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { Paperclip, Send } from 'lucide-react';
import EmptyState from '../components/EmptyState.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { api } from '../services/api.js';
import { useAuthStore } from '../store/authStore.js';
import { formatDateTime, getId } from '../utils/format.js';

const socketUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '');

const Chat = () => {
  const { accessToken, user } = useAuthStore();
  const [participants, setParticipants] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');
  const [typingUser, setTypingUser] = useState(null);
  const [file, setFile] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    api.get('/messages').then((response) => {
      setParticipants(response.data);
      setSelected(response.data[0] || null);
    });
  }, []);

  useEffect(() => {
    if (!accessToken) return undefined;

    const socket = io(socketUrl, { auth: { token: accessToken } });
    socketRef.current = socket;

    socket.on('receive_message', (message) => {
      setMessages((current) => {
        if (current.some((item) => item._id === message._id)) return current;
        const selectedId = selected ? getId(selected) : null;
        const belongsHere = selectedId && [getId(message.senderId), getId(message.receiverId)].includes(selectedId);
        return belongsHere ? [...current, message] : current;
      });
    });

    socket.on('user_typing', ({ userId, stopped }) => {
      setTypingUser(stopped ? null : userId);
    });

    return () => {
      socket.disconnect();
    };
  }, [accessToken, selected]);

  useEffect(() => {
    if (!selected) return;

    const selectedId = getId(selected);
    api.get(`/messages/${selectedId}`).then((response) => setMessages(response.data));
    api.patch(`/messages/read/${selectedId}`).catch(() => {});
    socketRef.current?.emit('join_room', { userId: selectedId });
  }, [selected]);

  const selectedId = useMemo(() => (selected ? getId(selected) : null), [selected]);

  const sendMessage = (event) => {
    event.preventDefault();
    if (!content.trim() || !selectedId) return;

    socketRef.current?.emit('send_message', { receiverId: selectedId, content }, (response) => {
      if (response?.message) {
        setMessages((current) => current.some((item) => item._id === response.message._id) ? current : [...current, response.message]);
      }
    });
    setContent('');
  };

  const uploadFile = async () => {
    if (!file || !selectedId) return;
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/messages/${selectedId}/file`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    setMessages((current) => [...current, response.data]);
    setFile(null);
  };

  const sendTyping = () => {
    if (selectedId) socketRef.current?.emit('typing', { receiverId: selectedId });
  };

  return (
    <div>
      <PageHeader title="Chat" description="One-to-one owner conversations only." />

      <div className="grid min-h-[calc(100vh-11rem)] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-subtle lg:grid-cols-[19rem_1fr]">
        <aside className="border-b border-slate-200 lg:border-b-0 lg:border-r">
          <div className="border-b border-slate-200 px-4 py-3 text-sm font-bold text-navy">People</div>
          <div className="max-h-72 overflow-auto lg:max-h-none">
            {participants.map((person) => (
              <button
                key={getId(person)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition ${selectedId === getId(person) ? 'bg-accent/10 text-navy' : 'hover:bg-slate-50'}`}
                type="button"
                onClick={() => setSelected(person)}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy text-xs font-bold text-white">
                  {person.name?.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{person.name}</p>
                  <p className="truncate text-xs text-slate-500 capitalize">{person.role}</p>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className="flex min-h-[32rem] flex-col">
          {selected ? (
            <>
              <div className="border-b border-slate-200 px-5 py-4">
                <p className="font-bold text-navy">{selected.name}</p>
                <p className="text-xs text-slate-500 capitalize">{selected.role}</p>
              </div>

              <div className="flex-1 space-y-3 overflow-auto bg-slate-50/70 p-5">
                {messages.map((message) => {
                  const mine = getId(message.senderId) === user.id;
                  return (
                    <div key={message._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-lg px-4 py-3 text-sm shadow-sm ${mine ? 'bg-accent text-white' : 'bg-white text-slate-700'}`}>
                        {message.content ? <p>{message.content}</p> : null}
                        {message.fileUrl ? (
                          <a className={`mt-1 flex items-center gap-2 font-semibold ${mine ? 'text-white' : 'text-accent'}`} href={message.fileUrl} target="_blank" rel="noreferrer">
                            <Paperclip size={15} />
                            Attachment
                          </a>
                        ) : null}
                        <p className={`mt-2 text-[11px] ${mine ? 'text-white/70' : 'text-slate-400'}`}>
                          {formatDateTime(message.createdAt)} {mine && message.read ? '  Seen' : ''}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {typingUser ? <p className="text-xs font-semibold text-slate-500">Typing...</p> : null}
              </div>

              <form className="border-t border-slate-200 p-4" onSubmit={sendMessage}>
                <div className="grid gap-2 md:grid-cols-[auto_1fr_auto]">
                  <label className="btn-secondary px-3" aria-label="Attach file">
                    <Paperclip size={17} />
                    <input className="hidden" type="file" accept="image/*,.pdf,.zip" onChange={(event) => setFile(event.target.files?.[0] || null)} />
                  </label>
                  <input
                    className="field"
                    placeholder="Type a message"
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    onKeyDown={sendTyping}
                  />
                  <button className="btn-primary" type="submit">
                    <Send size={17} />
                    Send
                  </button>
                </div>
                {file ? (
                  <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    <span className="truncate text-slate-600">{file.name}</span>
                    <button className="text-sm font-semibold text-accent" type="button" onClick={uploadFile}>Upload</button>
                  </div>
                ) : null}
              </form>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-5">
              <EmptyState title="No conversation selected" message="Available owner conversations will appear here." />
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Chat;
