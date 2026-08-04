"use client";

import { Landmark, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

type UiTheme = "youth" | "guofeng";

function applyTheme(theme: UiTheme) {
  document.documentElement.dataset.theme = theme;
  window.localStorage.setItem("pixel-ui-theme", theme);
}

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<UiTheme>("youth");

  useEffect(() => {
    const saved = window.localStorage.getItem("pixel-ui-theme") === "guofeng" ? "guofeng" : "youth";
    setTheme(saved);
    applyTheme(saved);
  }, []);

  function choose(next: UiTheme) {
    setTheme(next);
    applyTheme(next);
  }

  return (
    <div className="theme-switcher" aria-label="界面主题">
      <button aria-pressed={theme === "youth"} className={theme === "youth" ? "active" : ""} type="button" onClick={() => choose("youth")}>
        <Sparkles size={14} /> 青年创作
      </button>
      <button aria-pressed={theme === "guofeng"} className={theme === "guofeng" ? "active" : ""} type="button" onClick={() => choose("guofeng")}>
        <Landmark size={14} /> 国风政务
      </button>
    </div>
  );
}
