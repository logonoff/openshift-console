import type { FC, ReactNode } from 'react';
import { useCallback, useState } from 'react';
import {
  Alert,
  FileUpload,
  FileUploadProps,
  DropzoneErrorCode,
  TextArea,
  FormHelperText,
  HelperText,
  HelperTextItem,
  FormGroup,
  Skeleton,
} from '@patternfly/react-core';
import { isBinary } from 'istextorbinary';
import { useTranslation } from 'react-i18next';
import { units } from './units';

/** Maximal file size, in bytes, that user can upload */
const MAX_UPLOAD_SIZE = 4000000;

export interface DroppableFileInputProps {
  inputFileData: string;
  onChange: (inputFileData: string, inputFileIsBinary: boolean) => void;
  label: ReactNode;
  id: string;
  inputFieldHelpText: string;
  textareaFieldHelpText?: ReactNode;
  isRequired?: boolean;
  hideContents?: boolean;
}

export const DroppableFileInput: FC<DroppableFileInputProps> = ({
  inputFileData,
  onChange,
  label,
  id,
  inputFieldHelpText,
  textareaFieldHelpText,
  isRequired,
  hideContents = false,
}) => {
  const [filename, setFilename] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [inputFileIsBinary, setInputFileIsBinary] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const dataTestId = `${id}-textarea`;

  const { t } = useTranslation('public');

  const handleFileInputChange = useCallback<FileUploadProps['onFileInputChange']>(
    async (_, file: File) => {
      setIsLoading(true);

      setErrorMessage('');
      setFilename(file.name);
      const buffer = Buffer.from(await file.arrayBuffer());
      const fileIsBinary = isBinary(file.name, buffer);
      setInputFileIsBinary(fileIsBinary);
      onChange(buffer.toString(fileIsBinary ? 'base64' : 'utf-8'), fileIsBinary);

      setIsLoading(false);
    },
    [onChange],
  );

  const handleFileRejected = useCallback<FileUploadProps['dropzoneProps']['onDropRejected']>(
    (rejections) => {
      const code = rejections[0].errors[0].code;

      switch (code) {
        case DropzoneErrorCode.FileTooLarge:
          setErrorMessage(
            t('File is too large. Maximum file size is {{ size }}.', {
              size: units.humanize(MAX_UPLOAD_SIZE, 'binaryBytes', true).string,
            }),
          );
          break;
        case DropzoneErrorCode.TooManyFiles:
          setErrorMessage(t('Too many files. Maximum one file can be uploaded.'));
          break;
        default:
          setErrorMessage(t('An error occurred while uploading the file.'));
      }

      setFilename('');
      onChange('', false);
    },
    [onChange, t],
  );

  const handleClear = useCallback<FileUploadProps['onClearClick']>(() => {
    setFilename('');
    onChange('', false);
    setErrorMessage('');
  }, [onChange]);

  return (
    <FileUpload
      className="co-file-input"
      id={id}
      value={inputFileData}
      filename={filename}
      filenamePlaceholder={inputFieldHelpText}
      onFileInputChange={handleFileInputChange}
      onClearClick={handleClear}
      hideDefaultPreview
      browseButtonText={t('Browse...')}
      clearButtonText={t('Clear')}
      dropzoneProps={{
        maxSize: MAX_UPLOAD_SIZE,
        onDropRejected: handleFileRejected,
      }}
    >
      {isLoading && <Skeleton width="100%" className="co-file-dropzone__textarea" />}

      {!isLoading && inputFileIsBinary && (
        <Alert
          isInline
          className="co-alert"
          variant="info"
          title={t('Non-printable file detected.')}
          data-test="alert-info"
        >
          {t('File contains non-printable characters. Preview is not available.')}
        </Alert>
      )}

      {!isLoading && (!hideContents || textareaFieldHelpText || errorMessage) && (
        <FormGroup>
          {!hideContents && !inputFileIsBinary && (
            <TextArea
              data-test-id={dataTestId ?? 'file-input-textarea'}
              className="co-file-dropzone__textarea"
              resizeOrientation="vertical"
              data-test={`${id}-textarea`}
              onChange={(e) => {
                const fileContent = e.target.value;
                onChange(fileContent, false);
              }}
              value={inputFileData}
              aria-label={t('{{label}}', { label })}
              aria-describedby={textareaFieldHelpText ? `${id}-textarea-help` : undefined}
              required={isRequired}
            />
          )}
          {textareaFieldHelpText ? (
            <FormHelperText id={`${id}-textarea-help`}>
              <HelperText>
                <HelperTextItem>{textareaFieldHelpText}</HelperTextItem>
              </HelperText>
            </FormHelperText>
          ) : null}
          {errorMessage ? (
            <FormHelperText>
              <HelperText>
                <HelperTextItem variant="error">{errorMessage}</HelperTextItem>
              </HelperText>
            </FormHelperText>
          ) : null}
        </FormGroup>
      )}
    </FileUpload>
  );
};
