"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";

import { Link } from "@tiptap/extension-link";
import { Underline } from "@tiptap/extension-underline";
import { TextAlign } from "@tiptap/extension-text-align";
import { AuthenticatedImageExtension } from "./AuthenticatedImageExtension";
import { isSafeHttpUrl } from "@/lib/utils";

type ReadOnlyContentProps = {
  content: Record<string, unknown>;
};

export function ReadOnlyContent({ content }: ReadOnlyContentProps) {
  const editor = useEditor({
    immediatelyRender: false,
    editable: false,
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: true,
        validate: (href) => isSafeHttpUrl(href),
      }),
      AuthenticatedImageExtension,
      Table,
      TableRow,
      TableHeader,
      TableCell,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content,
    editorProps: {
      attributes: { class: "tiptap-editor readonly" },
    },
  });

  if (!editor) return null;
  return <EditorContent editor={editor} />;
}