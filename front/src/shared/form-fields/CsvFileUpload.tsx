import { ChangeEvent, FC } from 'react'
import { RiCloseLine } from 'react-icons/ri'
import { Input } from 'reactstrap'
import { CsvFileUploadProps } from '../../types'

const CsvFileUpload: FC<CsvFileUploadProps> = ({ name, values, setFieldValue, errors }) => {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length) {
      setFieldValue(name, Array.from(files))
    }
  }

  const handleClear = () => {
    setFieldValue(name, '')
  }

  const uploadedFile = values?.[name] as File[] | undefined

  return (
    <div className="csv-upload-container mb-3">
      <Input type="file" name={name} accept=".csv" onChange={handleChange} />
      {errors?.[name] && (
        <small className="text-danger">
          {typeof errors?.[name] === 'string'
            ? errors[name]
            : Array.isArray(errors?.[name])
              ? (errors[name] as string[]).join(', ')
              : ''}
        </small>
      )}

      {uploadedFile && uploadedFile?.length > 0 && (
        <div className="uploaded-file-preview mt-2 d-flex align-items-center gap-2">
          <span>{uploadedFile[0]?.name}</span>
          <RiCloseLine className="remove-icon" onClick={handleClear} />
        </div>
      )}
    </div>
  )
}

export default CsvFileUpload
