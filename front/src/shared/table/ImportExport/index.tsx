import { Formik } from 'formik'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RiDownload2Line, RiUpload2Line } from 'react-icons/ri'
import mutations from '../../../api/mutations'
import { SolidButton } from '../../button'
import { CsvFileUpload } from '../../form-fields'
import ImportModal from './ImportModal'
import { ImportExportProps } from '../../../types'

const ImportExport = ({ importExport, refetch, moduleName, exportButton = true }: ImportExportProps) => {
  const { t } = useTranslation('common')
  const [modal, setModal] = useState(false)

  const isImportEnabled = !!importExport?.importUrl
  const isExportEnabled = !!importExport?.exportUrl

  const { mutate: importMutate, isPending: isImporting } = mutations.useImportCsv(importExport.importUrl!)
  const { mutate: exportMutate } = mutations.useExportCsv(importExport.exportUrl!)

  const handleExport = () => {
    exportMutate(importExport.paramsProps || {}, {
      onSuccess: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${moduleName.toLowerCase()}.csv`
        link.click()
        window.URL.revokeObjectURL(url)
      },
    })
  }

  const handleImport = (formData: FormData) => {
    importMutate(formData, {
      onSuccess: () => {
        refetch?.()
        setModal(false)
      },
    })
  }

  return (
    <>
      <div className="d-flex gap-2">
        {isImportEnabled && (
          <button type="button" className="btn btn-outline-secondary" onClick={() => setModal(true)}>
            <RiUpload2Line className="me-1" />
            {t('import')}
          </button>
        )}

        {isExportEnabled && exportButton && (
          <button type="button" className="btn btn-outline-secondary" onClick={handleExport}>
            <RiDownload2Line className="me-1" />
            {t('export')}
          </button>
        )}
      </div>

      {isImportEnabled && (
        <ImportModal open={modal} onClose={() => setModal(false)} title={t('import')}>
          <Formik
            initialValues={{ [moduleName?.toLowerCase()]: '' }}
            onSubmit={(values) => {
              const formData = new FormData()
              Object.values(values[moduleName.toLowerCase()]).forEach((el) => {
                formData.append(`${moduleName?.toLowerCase()}`, el)
              })
              handleImport(formData)
            }}
            validateOnBlur={false}
          >
            {({ values, setFieldValue, errors, handleSubmit }) => (
              <form className="theme-form" onSubmit={handleSubmit}>
                <CsvFileUpload
                  name={moduleName.toLowerCase()}
                  values={values}
                  setFieldValue={setFieldValue}
                  errors={errors}
                />
                <div className="modal-footer">
                  {values[moduleName.toLowerCase()]?.length > 0 && (
                    <a href="#!" onClick={() => setFieldValue(`${moduleName}`, '')}>
                      {t('clear')}
                    </a>
                  )}
                  <SolidButton type="submit" className="btn-theme ms-auto" title={t('import')} loading={isImporting} />
                </div>
              </form>
            )}
          </Formik>
        </ImportModal>
      )}
    </>
  )
}

export default ImportExport
