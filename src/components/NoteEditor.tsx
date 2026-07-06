"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Copy,
  RefreshCw,
  Star,
  Pin,
  Trash2,
  Download,
  Share2,
  Image as ImageIcon,
  FileJson,
  FileText,
  Printer,
  ArrowRightLeft,
  Maximize2,
  Minimize2,
  Lock,
  Globe,
  Server,
  User,
  Shield,
  KeyRound,
  StickyNote,
  ChevronsDownUp,
  ChevronsUpDown,
} from "lucide-react";
import { api } from "@/lib/api";
import { AuthenticatedImage } from "./AuthenticatedImage";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/lib/toast";
import {
  credentialsBlock,
  downloadFile,
  extractTextPreview,
  formatDate,
  makePassword,
  noteToMarkdown,
  passwordScore,
} from "@/lib/utils";
import type { Note, NoteType, Project, VaultSection } from "@/lib/types";
import { vaultSections } from "@/lib/types";
import {
  typeMeta,
  fieldMeta,
  categorySuggestions,
  sectionHasData,
  sectionSummary,
  type FieldKey,
  type SectionDef,
} from "@/lib/note-fields";
import { ReadOnlyContent } from "./ReadOnlyContent";
import { RichEditor } from "./RichEditor";
import { ShareModal } from "./ShareModal";
import { TypeTabs } from "./ui/TypeTabs";
import { Field } from "./ui/Field";
import { TagInput } from "./ui/TagInput";
import { CategoryInput } from "./ui/CategoryInput";
import { CollapsibleSection } from "./ui/CollapsibleSection";

const fieldIcons: Partial<Record<FieldKey, typeof Globe>> = {
  host: Server,
  port: Globe,
  url: Globe,
  login: User,
  password: Lock,
  totpSecret: Shield,
  sshKey: KeyRound,
  memo: StickyNote,
};

type SectionPref = "open" | "closed";

type NoteEditorProps = {
  note: Note;
  projects: Project[];
  vaultSection?: VaultSection;
  onMoved?: () => void;
};

function hasRichContent(content: Record<string, unknown>) {
  return extractTextPreview(content, 1).length > 0;
}

export function NoteEditor({ note, projects, vaultSection, onMoved }: NoteEditorProps) {
  const token = useAppStore((s) => s.token);
  const upsertNote = useAppStore((s) => s.upsertNote);
  const removeNote = useAppStore((s) => s.removeNote);
  const setSelectedNote = useAppStore((s) => s.setSelectedNote);
  const toast = useToast((s) => s.push);

  const [draft, setDraft] = useState(note);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [showShare, setShowShare] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [sectionPrefs, setSectionPrefs] = useState<Record<string, SectionPref>>({});
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDraft(note);
    setPreviewMode(false);
    setSectionPrefs({});
  }, [note.id]);

  useEffect(() => {
    setSectionPrefs({});
  }, [draft.type]);

  const save = useCallback(
    async (patch: Partial<Note>) => {
      if (!token) return;
      const next = { ...draft, ...patch };
      setDraft(next);
      setSaveState("saving");

      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        try {
          const updated = await api.notes.update(token, note.id, patch);
          upsertNote(updated);
          setSaveState("saved");
        } catch {
          setSaveState("error");
          toast("Ошибка сохранения", "error");
        }
      }, 450);
    },
    [draft, note.id, token, upsertNote, toast],
  );

  const score = useMemo(() => passwordScore(draft.password ?? ""), [draft.password]);
  const meta = typeMeta[draft.type];

  const sectionKey = useCallback((section: SectionDef) => `${draft.type}:${section.id}`, [draft.type]);

  const isSectionOpen = useCallback(
    (section: SectionDef) => {
      const key = sectionKey(section);
      const pref = sectionPrefs[key];
      if (pref === "open") return true;
      if (pref === "closed") return false;
      return sectionHasData(section, draft, hasRichContent);
    },
    [sectionPrefs, sectionKey, draft],
  );

  const toggleSection = useCallback(
    (section: SectionDef) => {
      const key = sectionKey(section);
      const open = isSectionOpen(section);
      setSectionPrefs((prev) => ({ ...prev, [key]: open ? "closed" : "open" }));
    },
    [sectionKey, isSectionOpen],
  );

  const filledCount = useMemo(
    () => meta.sections.filter((s) => sectionHasData(s, draft, hasRichContent)).length,
    [meta.sections, draft],
  );

  const openCount = useMemo(
    () => meta.sections.filter((s) => isSectionOpen(s)).length,
    [meta.sections, isSectionOpen],
  );

  function expandFilled() {
    const next: Record<string, SectionPref> = { ...sectionPrefs };
    for (const section of meta.sections) {
      if (sectionHasData(section, draft, hasRichContent)) {
        next[sectionKey(section)] = "open";
      }
    }
    setSectionPrefs(next);
  }

  function collapseAll() {
    const next: Record<string, SectionPref> = {};
    for (const section of meta.sections) {
      next[sectionKey(section)] = "closed";
    }
    setSectionPrefs(next);
  }

  const saveLabel =
    saveState === "saving"
      ? "Сохраняю…"
      : saveState === "error"
        ? "Ошибка"
        : `Сохранено ${new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`;

  async function copyText(value: string, label = "Скопировано") {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    toast(label, "success");
  }

  async function handleDuplicate() {
    if (!token) return;
    const copy = await api.notes.duplicate(token, note.id);
    upsertNote(copy);
    setSelectedNote(copy.id);
    toast("Копия создана", "success");
  }

  async function handleDelete() {
    if (!token || !confirm("Удалить заметку?")) return;
    await api.notes.remove(token, note.id);
    removeNote(note.id);
    toast("Заметка удалена", "info");
  }

  async function handleMove(projectId: string) {
    if (!token || projectId === draft.projectId) return;
    const updated = await api.notes.move(token, note.id, projectId);
    upsertNote(updated);
    toast("Заметка перенесена", "success");
    onMoved?.();
  }

  async function handleImageUpload(file: File) {
    if (!token) throw new Error("Нет авторизации");
    const attachment = await api.upload(token, note.id, file);
    const updated = await api.notes.update(token, note.id, {});
    upsertNote({ ...updated, attachments: [...draft.attachments, attachment] });
    toast("Изображение загружено", "success");
    return api.attachmentUrl(attachment.id);
  }

  async function handleFileAttach(files: FileList | null) {
    if (!files?.length || !token) return;
    for (const file of Array.from(files)) {
      await api.upload(token, note.id, file);
    }
    const updated = await api.notes.update(token, note.id, {});
    upsertNote(updated);
    setDraft(updated);
    toast("Файлы добавлены", "success");
  }

  async function downloadAttachment(id: string, filename: string) {
    if (!token) return;
    const res = await fetch(api.attachmentUrl(id), { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDeleteAttachment(id: string) {
    if (!token) return;
    await api.deleteAttachment(token, id);
    const updated = await api.notes.update(token, note.id, {});
    upsertNote(updated);
    setDraft(updated);
    toast("Вложение удалено", "info");
  }

  function exportJson() {
    downloadFile(
      `${draft.title.toLowerCase().replace(/[^a-zа-я0-9]+/gi, "-") || "note"}.json`,
      JSON.stringify(draft, null, 2),
    );
    toast("JSON экспортирован", "success");
  }

  function exportMd() {
    downloadFile(
      `${draft.title.toLowerCase().replace(/[^a-zа-я0-9]+/gi, "-") || "note"}.md`,
      noteToMarkdown(draft),
      "text/markdown",
    );
    toast("Markdown экспортирован", "success");
  }

  function getFieldValue(key: FieldKey): string {
    if (key === "content" || key === "attachments") return "";
    return (draft[key] as string | null | undefined) ?? "";
  }

  function setFieldValue(key: FieldKey, value: string) {
    if (key === "content" || key === "attachments") return;
    save({ [key]: value });
  }

  function renderField(key: FieldKey) {
    const fm = fieldMeta[key];
    if (!fm || key === "content" || key === "attachments") return null;

    const isPassword = key === "password";

    return (
      <Field
        key={key}
        label={fm.label}
        hint={fm.hint}
        icon={fieldIcons[key]}
        value={getFieldValue(key)}
        onChange={(v) => setFieldValue(key, v)}
        placeholder={fm.placeholder}
        secret={fm.secret}
        mono={fm.mono}
        multiline={fm.multiline}
        wide={fm.wide}
        onCopy={() => void copyText(getFieldValue(key))}
        link={key === "url" && draft.url ? draft.url : undefined}
        trailing={
          isPassword ? (
            <button
              type="button"
              className="ui-icon-btn ui-generate-btn"
              onClick={() => {
                const pwd = makePassword();
                save({ password: pwd });
                void copyText(pwd, "Пароль сгенерирован");
              }}
              title="Сгенерировать"
            >
              <RefreshCw size={14} />
            </button>
          ) : undefined
        }
      />
    );
  }

  const filledFields = meta.sections
    .flatMap((s) => s.fields)
    .filter((k) => k !== "content" && k !== "attachments" && getFieldValue(k));

  function renderSectionBody(section: SectionDef) {
    const scalarFields = section.fields.filter((k) => k !== "content" && k !== "attachments");
    const hasContent = section.fields.includes("content");
    const hasAttachments = section.fields.includes("attachments");
    const showCopyAll =
      ((draft.type === "credential" && section.id === "keys") ||
        (draft.type === "link" && section.id === "access")) &&
      filledFields.length > 0;

    return (
      <>
        {scalarFields.length ? (
          <div
            className={`note-section-grid ${section.id === "conn" || section.id === "resource" ? "conn-grid" : ""}`}
          >
            {scalarFields.map((key) => renderField(key))}
            {section.id === "auth" || section.id === "access" ? (
              draft.password ? (
                <div className="password-strength-bar wide">
                  <span className={`strength strength-${score}`}>
                    <i />
                    {score >= 4 ? "Сильный пароль" : score >= 2 ? "Средний пароль" : "Слабый пароль"}
                  </span>
                </div>
              ) : null
            ) : null}
            {showCopyAll ? (
              <div className="copy-all-row wide">
                <button
                  className="ghost-button"
                  onClick={() => void copyText(credentialsBlock(draft), "Все данные скопированы")}
                >
                  <Copy size={14} />
                  Скопировать все доступы
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {hasContent ? (
          <div className="body-control">
            <div className="body-toolbar">
              <span>{fieldMeta.content.label}</span>
              <div className="segmented-control">
                <button className={!previewMode ? "active" : ""} onClick={() => setPreviewMode(false)}>
                  Редактор
                </button>
                <button className={previewMode ? "active" : ""} onClick={() => setPreviewMode(true)}>
                  Просмотр
                </button>
              </div>
            </div>
            {previewMode ? (
              <div className="note-preview-panel">
                <ReadOnlyContent content={draft.content} />
              </div>
            ) : (
              <RichEditor
                content={draft.content}
                onChange={(content) => save({ content })}
                onImageUpload={handleImageUpload}
              />
            )}
          </div>
        ) : null}

        {hasAttachments ? (
          <div className="attachments inline">
            <div className="attachments-header">
              <p className="attachments-sub">
                {draft.attachments.length
                  ? `${draft.attachments.length} ${draft.attachments.length === 1 ? "файл" : "файлов"}`
                  : "Перетащите или добавьте изображения"}
              </p>
              <label className="ghost-button compact upload-label">
                <ImageIcon size={15} />
                Добавить
                <input hidden type="file" accept="image/*" multiple onChange={(e) => void handleFileAttach(e.target.files)} />
              </label>
            </div>
            {draft.attachments.length ? (
              <div className="attachment-grid">
                {draft.attachments.map((att) => (
                  <figure key={att.id}>
                    <AuthenticatedImage src={api.attachmentUrl(att.id)} alt={att.filename} />
                    <figcaption>
                      <span>{att.filename}</span>
                      <div className="att-actions">
                        <button
                          type="button"
                          className="download-link"
                          onClick={() => void downloadAttachment(att.id, att.filename)}
                          aria-label="Скачать"
                        >
                          <Download size={14} />
                        </button>
                        <button className="delete-att" onClick={() => void handleDeleteAttachment(att.id)} aria-label="Удалить">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </figcaption>
                  </figure>
                ))}
              </div>
            ) : (
              <label className="attachment-dropzone upload-label">
                <ImageIcon size={24} strokeWidth={1.5} />
                <span>Нажмите или перетащите файлы</span>
                <input hidden type="file" accept="image/*" multiple onChange={(e) => void handleFileAttach(e.target.files)} />
              </label>
            )}
          </div>
        ) : null}
      </>
    );
  }

  return (
    <section className={`editor ${focusMode ? "focus-mode" : ""}`} aria-label="Редактор заметки">
      <header className="editor-header">
        <div className="editor-header-main">
          <div className="editor-status">
            <span className={`save-dot save-${saveState}`} />
            <p className={`overline save-indicator save-${saveState}`}>{saveLabel}</p>
          </div>
          <input
            className="title-input"
            value={draft.title}
            onChange={(e) => save({ title: e.target.value })}
            aria-label="Название заметки"
            placeholder="Без названия"
          />
          <span className="editor-meta">
            {meta.label}
            {draft.encrypted || draft.type === "credential" ? (
              <span className="encrypted-badge" title="Секреты шифруются AES-256">
                <Lock size={12} />
                зашифровано
              </span>
            ) : null}
            · изменено {formatDate(draft.updatedAt)}
          </span>
        </div>
        <div className="header-actions">
          <button
            className={`icon-button ${draft.favorite ? "active" : ""}`}
            onClick={() => save({ favorite: !draft.favorite })}
            title="Избранное"
          >
            <Star size={16} />
          </button>
          <button
            className={`icon-button ${draft.pinned ? "active" : ""}`}
            onClick={() => save({ pinned: !draft.pinned })}
            title="Закрепить"
          >
            <Pin size={16} />
          </button>
          <div className="action-dropdown">
            <select
              value={draft.projectId}
              onChange={(e) => void handleMove(e.target.value)}
              aria-label="Перенести в проект"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <ArrowRightLeft size={14} className="dropdown-icon" />
          </div>
          <div className="header-action-group">
            <button className="ghost-button compact" onClick={() => void handleDuplicate()} title="Копия">
              Копия
            </button>
            <button className="ghost-button compact" onClick={() => setShowShare(true)} title="Поделиться">
              <Share2 size={15} />
            </button>
            <button className="ghost-button compact" onClick={exportJson} title="JSON">
              <FileJson size={15} />
            </button>
            <button className="ghost-button compact" onClick={exportMd} title="Markdown">
              <FileText size={15} />
            </button>
            <button className="ghost-button compact" onClick={() => window.print()} title="Печать">
              <Printer size={15} />
            </button>
            <button
              className={`ghost-button compact ${focusMode ? "active" : ""}`}
              onClick={() => setFocusMode((v) => !v)}
              title="Фокус"
            >
              {focusMode ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
            <button className="ghost-button compact" onClick={() => save({ archived: !draft.archived })}>
              {draft.archived ? "Вернуть" : "Архив"}
            </button>
            <button className="danger-button compact" onClick={() => void handleDelete()} title="Удалить">
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      </header>

      {(vaultSection ? vaultSections.find((s) => s.id === vaultSection)?.types.length !== 1 : true) ? (
        <div className="editor-type-bar">
          <TypeTabs value={draft.type} onChange={(type: NoteType) => save({ type })} vaultSection={vaultSection} />
        </div>
      ) : null}

      <div className="editor-meta-bar">
        <div className="meta-field">
          <span className="meta-label">Категория</span>
          <CategoryInput
            value={draft.category}
            suggestions={categorySuggestions[draft.type]}
            onChange={(category) => save({ category })}
          />
        </div>
        <div className="meta-field wide">
          <span className="meta-label">Теги</span>
          <TagInput
            tags={draft.tags}
            suggestions={categorySuggestions[draft.type].map((s) => s.toLowerCase())}
            onChange={(tags) => save({ tags })}
          />
        </div>
      </div>

      <div className="sections-toolbar">
        <span className="sections-toolbar-label">
          {meta.sections.length} блоков · {filledCount} заполнено · {openCount} открыто
        </span>
        <div className="sections-toolbar-actions">
          {filledCount > 0 ? (
            <button type="button" className="ghost-button compact" onClick={expandFilled}>
              <ChevronsUpDown size={14} />
              Заполненные
            </button>
          ) : null}
          <button type="button" className="ghost-button compact" onClick={collapseAll}>
            <ChevronsDownUp size={14} />
            Свернуть все
          </button>
        </div>
      </div>

      <div className="note-sections-stack">
        {meta.sections.map((section) => {
          const filled = sectionHasData(section, draft, hasRichContent);
          const open = isSectionOpen(section);
          const summary = sectionSummary(section, draft, extractTextPreview);

          return (
            <CollapsibleSection
              key={section.id}
              id={section.id}
              title={section.title}
              summary={summary}
              filled={filled}
              open={open}
              onToggle={() => toggleSection(section)}
              accent={meta.accent}
            >
              {renderSectionBody(section)}
            </CollapsibleSection>
          );
        })}
      </div>

      {showShare ? (
        <ShareModal
          token={token!}
          noteId={note.id}
          noteType={draft.type}
          vaultSection={vaultSection}
          onClose={() => setShowShare(false)}
        />
      ) : null}
    </section>
  );
}