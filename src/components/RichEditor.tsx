"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";

import { Link } from "@tiptap/extension-link";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Underline } from "@tiptap/extension-underline";
import { TextAlign } from "@tiptap/extension-text-align";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Quote,
  Heading2,
  Link as LinkIcon,
  Image as ImageIcon,
  Table as TableIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
  Minus,
} from "lucide-react";
import { useEffect, useState } from "react";
import { InputDialog } from "./InputDialog";
import { AuthenticatedImageExtension } from "./AuthenticatedImageExtension";
import { isSafeHttpUrl } from "@/lib/utils";

const lowlight = createLowlight(common);

type RichEditorProps = {
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void;
  onImageUpload?: (file: File) => Promise<string>;
};

type DialogType = "link" | "image-url" | null;

export function RichEditor({ content, onChange, onImageUpload }: RichEditorProps) {
  const [dialog, setDialog] = useState<DialogType>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Underline,
      Link.configure({
        openOnClick: false,
        validate: (href) => isSafeHttpUrl(href),
      }),
      AuthenticatedImageExtension,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({ placeholder: "Опишите шаги, команды, нюансы…" }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      CodeBlockLowlight.configure({ lowlight }),
    ],
    content,
    onUpdate: ({ editor: ed }) => onChange(ed.getJSON() as Record<string, unknown>),
    editorProps: {
      attributes: { class: "tiptap-editor" },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = JSON.stringify(editor.getJSON());
    const incoming = JSON.stringify(content);
    if (current !== incoming) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) return <div className="editor-loading">Загрузка редактора...</div>;

  function addLink(url: string) {
    if (!editor || !isSafeHttpUrl(url)) return;
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  async function addImageFromFile() {
    if (!editor || !onImageUpload) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file || !editor) return;
      const url = await onImageUpload(file);
      editor.chain().focus().setImage({ src: url }).run();
    };
    input.click();
  }

  function addImageUrl(url: string) {
    if (!editor || !isSafeHttpUrl(url)) return;
    editor.chain().focus().setImage({ src: url }).run();
  }

  function addTable() {
    if (!editor) return;
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }

  const tools = [
    { icon: Undo, action: () => editor.chain().focus().undo().run(), label: "Отменить" },
    { icon: Redo, action: () => editor.chain().focus().redo().run(), label: "Повторить" },
    { icon: Bold, action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive("bold"), label: "Жирный" },
    { icon: Italic, action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive("italic"), label: "Курсив" },
    { icon: UnderlineIcon, action: () => editor.chain().focus().toggleUnderline().run(), active: editor.isActive("underline"), label: "Подчёркнутый" },
    { icon: Strikethrough, action: () => editor.chain().focus().toggleStrike().run(), active: editor.isActive("strike"), label: "Зачёркнутый" },
    { icon: Code, action: () => editor.chain().focus().toggleCodeBlock().run(), active: editor.isActive("codeBlock"), label: "Код" },
    { icon: Heading2, action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive("heading", { level: 2 }), label: "Заголовок" },
    { icon: List, action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive("bulletList"), label: "Список" },
    { icon: ListOrdered, action: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive("orderedList"), label: "Нумерация" },
    { icon: Quote, action: () => editor.chain().focus().toggleBlockquote().run(), active: editor.isActive("blockquote"), label: "Цитата" },
    { icon: Minus, action: () => editor.chain().focus().setHorizontalRule().run(), label: "Разделитель" },
    { icon: AlignLeft, action: () => editor.chain().focus().setTextAlign("left").run(), label: "Слева" },
    { icon: AlignCenter, action: () => editor.chain().focus().setTextAlign("center").run(), label: "По центру" },
    { icon: AlignRight, action: () => editor.chain().focus().setTextAlign("right").run(), label: "Справа" },
    { icon: LinkIcon, action: () => setDialog("link"), active: editor.isActive("link"), label: "Ссылка" },
    { icon: ImageIcon, action: () => (onImageUpload ? void addImageFromFile() : setDialog("image-url")), label: "Картинка" },
    { icon: TableIcon, action: addTable, label: "Таблица" },
  ];

  return (
    <>
      <div
        className="rich-editor"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files?.[0];
          if (file?.type.startsWith("image/") && onImageUpload) {
            void onImageUpload(file).then((url) => editor.chain().focus().setImage({ src: url }).run());
          }
        }}
      >
        <div className="rich-toolbar" role="toolbar" aria-label="Форматирование">
          {tools.map((tool) => (
            <button
              key={tool.label}
              type="button"
              className={tool.active ? "active" : ""}
              onClick={tool.action}
              title={tool.label}
              aria-label={tool.label}
            >
              <tool.icon size={16} />
            </button>
          ))}
        </div>
        <EditorContent editor={editor} />
      </div>

      {dialog === "link" ? (
        <InputDialog
          title="Добавить ссылку"
          label="URL"
          placeholder="https://..."
          onConfirm={addLink}
          onClose={() => setDialog(null)}
        />
      ) : null}

      {dialog === "image-url" ? (
        <InputDialog
          title="Добавить изображение"
          label="URL изображения"
          placeholder="https://..."
          onConfirm={addImageUrl}
          onClose={() => setDialog(null)}
        />
      ) : null}
    </>
  );
}