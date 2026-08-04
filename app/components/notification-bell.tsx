"use client";

import { Bell, Check, CheckCheck, X } from "lucide-react";
import { useEffect, useState } from "react";

type Notification = {
  id: string;
  title: string;
  body: string;
  type: string;
  is_read: number;
  created_at: string;
};

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    function load() {
      fetch("/api/notifications")
        .then((r) => r.json())
        .then((data) => {
          setNotifications(data.notifications ?? []);
          setUnread(data.unread ?? 0);
        })
        .catch(() => {});
    }
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  async function markAllRead() {
    setLoading(true);
    const resp = await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    });
    if (resp.ok) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      setUnread(0);
    }
    setLoading(false);
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} 分钟前`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} 小时前`;
    const days = Math.floor(hours / 24);
    return `${days} 天前`;
  }

  return (
    <div className="notif-bell-wrap">
      <button type="button" className="notif-bell" onClick={() => setOpen(!open)} aria-label="通知">
        <Bell size={18} />
        {unread > 0 && <span className="notif-badge">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div className="notif-panel">
          <div className="notif-header">
            <span>通知</span>
            {unread > 0 && (
              <button type="button" onClick={markAllRead} disabled={loading}>
                <CheckCheck size={14} /> 全部已读
              </button>
            )}
            <button type="button" onClick={() => setOpen(false)}><X size={16} /></button>
          </div>
          {notifications.length === 0 ? (
            <div className="notif-empty">暂无通知</div>
          ) : (
            <div className="notif-list">
              {notifications.map((n) => (
                <article key={n.id} className={n.is_read ? "" : "unread"}>
                  <div className="notif-item-head">
                    <strong>{n.title}</strong>
                    {n.is_read === 0 && <span className="notif-dot" />}
                  </div>
                  {n.body && <p>{n.body}</p>}
                  <small>{timeAgo(n.created_at)}</small>
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
