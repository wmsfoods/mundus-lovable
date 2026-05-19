import { useState, useRef } from "react";
import { UploadIcon, FileIcon, XIcon } from "@/components/icons";

export type DropzoneFile = {
  name: string;
  size: number;
};

type DropzoneProps = {
  label?: string;
  files?: DropzoneFile[];
  onChange: (files: DropzoneFile[]) => void;
  accept?: string;
};

export function Dropzone({
  label,
  files = [],
  onChange,
  accept = ".pdf,.png,.jpg,.jpeg",
}: DropzoneProps) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handle = (list: FileList | null) => {
    if (!list) return;
    const arr = Array.from(list).slice(0, 5);
    onChange([...files, ...arr.map((f) => ({ name: f.name, size: f.size }))]);
  };

  return (
    <div className="field">
      {label && (
        <label className="field-label">
          {label}
          <span className="req">*</span>
        </label>
      )}
      <div
        className={`dropzone ${drag ? "dragover" : ""}`.trim()}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          handle(e.dataTransfer.files);
        }}
      >
        <UploadIcon size={32} style={{ color: "var(--fg)" }} />
        <div className="dropzone-text" style={{ marginTop: 12 }}>
          Choose a file or drag and drop it here
        </div>
        <div
          className="dropzone-text"
          style={{ color: "var(--fg-muted)", fontSize: "var(--fs-sm)", marginTop: 4 }}
        >
          (accepted formats: PDF, PNG, or JPG).
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          style={{ display: "none" }}
          onChange={(e) => handle(e.target.files)}
        />
        {files.length > 0 && (
          <div className="dropzone-files" onClick={(e) => e.stopPropagation()}>
            {files.map((f, i) => (
              <div key={i} className="dropzone-file">
                <FileIcon size={16} style={{ color: "var(--p800)" }} />
                <span className="dropzone-file-name">{f.name}</span>
                <button
                  type="button"
                  className="tag-x"
                  onClick={() => onChange(files.filter((_, j) => j !== i))}
                  aria-label="Remove file"
                >
                  <XIcon size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
