import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { DecoupledEditor as DecoupledEditorType } from '@ckeditor/ckeditor5-editor-decoupled'
import type { EventInfo } from '@ckeditor/ckeditor5-utils'
import { CkEditorProps, EditorModules } from '../../types'

function CkEditor({ onChange, editorLoaded, name, value, label, placeholder, error, touched }: CkEditorProps) {
  const { t } = useTranslation('common')
  const [editor, setEditor] = useState<EditorModules | null>(null)
  const editorRef = useRef<HTMLDivElement>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    import('@ckeditor/ckeditor5-react').then(({ CKEditor }) => {
      import('@ckeditor/ckeditor5-build-decoupled-document').then((module) => {
        setEditor({
          CKEditor,
          DecoupledEditor: module.default as unknown as typeof DecoupledEditorType,
        })
      })
    })
  }, [])

  if (!editor) {
    return null
  }

  const { CKEditor, DecoupledEditor } = editor

  return (
    <div className="ck-editor-wrapper">
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
          {label} *
        </label>
      )}
      <div className="w-full">
        {editorLoaded && editor ? (
          <>
            <div ref={toolbarRef} className="ck-toolbar-container" />
            <div ref={editorRef} />
            <CKEditor
              editor={DecoupledEditor as unknown as typeof DecoupledEditorType}
              data={value}
              onReady={(editorInstance: DecoupledEditorType) => {
                if (toolbarRef.current && editorInstance.ui.view.toolbar?.element) {
                  toolbarRef.current.appendChild(editorInstance.ui.view.toolbar.element)
                }
              }}
              onChange={(_event: EventInfo, editorInstance: DecoupledEditorType) => {
                const data = editorInstance?.getData()
                onChange(data)
              }}
              config={{
                placeholder: placeholder || 'Enter content...',
                toolbar: [
                  'heading',
                  '|',
                  'bold',
                  'italic',
                  'fontColor',
                  '|',
                  'link',
                  '|',
                  'bulletedList',
                  'numberedList',
                  '|',
                  'outdent',
                  'indent',
                  '|',
                  'blockQuote',
                  'insertTable',
                  '|',
                  'undo',
                  'redo',
                ],
              }}
            />
          </>
        ) : (
          <div className="flex  items-center justify-center h-32 border border-gray-300 rounded-md bg-gray-50">
            <span className="text-gray-500">{t('Editor loading') || 'Loading...'}</span>
          </div>
        )}
      </div>
      {error && touched && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}

export default CkEditor
