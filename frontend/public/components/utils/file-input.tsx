import type { FC } from 'react';
import { Component } from 'react';
import { css } from '@patternfly/react-styles';
import { NativeTypes } from 'react-dnd-html5-backend';
import type { DropTargetMonitor } from 'react-dnd';
import { useDrop } from 'react-dnd';
import { Alert } from '@patternfly/react-core';
/* eslint-disable-next-line */
import { withTranslation, WithTranslation } from 'react-i18next';
import { isBinary } from 'istextorbinary';

import withDragDropContext from './drag-drop-context';

// Maximal file size, in bytes, that user can upload
const maxFileUploadSize = 4000000;

type FileInputInnerProps = Omit<FileInputProps, 'connectDropTarget' | 'isOver' | 'canDrop'> & {
  dropRef: (node: HTMLDivElement | null) => void;
  isOver: boolean;
  canDrop: boolean;
};

const FileInputInner: FC<FileInputInnerProps> = ({
  dropRef,
  errorMessage,
  fileIsBinary,
  hideContents,
  isOver,
  canDrop,
  id,
  isRequired,
  t,
  label,
  inputFileName,
  inputFieldHelpText,
  inputFileData,
  textareaFieldHelpText,
  onDataChange,
  onFileChange,
  'data-test-id': dataTestId,
}) => {
  const klass = css('co-file-dropzone-container', {
    'co-file-dropzone--drop-over': isOver,
  });

  const handleDataChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    onDataChange(event.target.value);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    onFileChange(event.target.files[0]);
  };

  return (
    <div className="co-file-dropzone" ref={dropRef}>
      {canDrop && (
        <div className={klass}>
          <p className="co-file-dropzone__drop-text">{t('public~Drop file here')}</p>
        </div>
      )}

      <div className="form-group">
        <label className={css({ 'co-required': isRequired })} htmlFor={id}>
          {label}
        </label>
        <div className="modal-body__field">
          <div className="pf-v6-c-input-group">
            <span id={id} data-test={`${id}-text`} className="pf-v6-c-form-control pf-m-readonly">
              <input
                type="text"
                id={id}
                aria-label={t('public~{{label}} filename', { label })} // Make the 'aria-label' unique since 'input' and 'textarea' fields share the same 'id'.
                value={inputFileName}
                aria-describedby={inputFieldHelpText ? `${id}-help` : undefined}
                readOnly
              />
            </span>
            <span
              id={id}
              data-test={`${id}-file`}
              className="pf-v6-c-button pf-m-control co-btn-file"
            >
              <input
                id={id}
                type="file"
                aria-label={t('public~Browse...')}
                onChange={handleFileUpload}
                data-test="file-input"
              />
              {t('public~Browse...')}
            </span>
          </div>
          {inputFieldHelpText ? (
            <p className="help-block" id={`${id}-help`}>
              {inputFieldHelpText}
            </p>
          ) : null}
          {!hideContents && (
            <span
              data-test={`${id}-textarea`}
              className="pf-v6-c-form-control pf-m-resize-vertical pf-v6-u-mt-sm"
            >
              <textarea
                id={id}
                data-test-id={dataTestId ?? 'file-input-textarea'}
                className="co-file-dropzone__textarea"
                onChange={handleDataChange}
                value={inputFileData}
                aria-label={t('public~{{label}}', { label })}
                aria-describedby={textareaFieldHelpText ? `${id}-textarea-help` : undefined}
                required={isRequired}
              />
            </span>
          )}
          {textareaFieldHelpText ? (
            <p className="help-block" id={`${id}-textarea-help`}>
              {textareaFieldHelpText}
            </p>
          ) : null}
          {errorMessage && <div className="text-danger">{errorMessage}</div>}
          {fileIsBinary && (
            <Alert
              isInline
              className="co-alert"
              variant="info"
              title={t('public~Non-printable file detected.')}
              data-test="alert-info"
            >
              {t('public~File contains non-printable characters. Preview is not available.')}
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
};

const FileInputWithTranslation: FC<FileInputProps> = (props) => {
  const { onDrop } = props;

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: NativeTypes.FILE,
    collect: (monitor: DropTargetMonitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
    drop: (_item, monitor: DropTargetMonitor) => {
      if (onDrop && monitor.isOver()) {
        onDrop(props, monitor);
      }
    },
  });

  return <FileInputInner {...props} dropRef={drop} isOver={isOver} canDrop={canDrop} />;
};

export const FileInput = withTranslation()(FileInputWithTranslation);

const DroppableFileInputWithTranslation = withDragDropContext(
  class DroppableFileInput extends Component<DroppableFileInputProps, DroppableFileInputState> {
    constructor(props) {
      super(props);
      this.state = {
        inputFileName: '',
        inputFileData: this.props.inputFileData || '',
        // @ts-ignore Fix this in CONSOLE-4088
        inputFileIsBinary: this.props.inputFileIsBinary || isBinary(null, this.props.inputFileData),
      };
      this.handleFileDrop = this.handleFileDrop.bind(this);
      this.onFileChange = this.onFileChange.bind(this);
      this.onDataChange = this.onDataChange.bind(this);
    }

    onFileChange(file: File) {
      const { t } = this.props;
      if (file.size > maxFileUploadSize) {
        this.onDataChange({
          errorMessage: t('public~Maximum file size exceeded. File limit is 4MB.'),
          inputFileName: '',
          inputFileData: '',
        });
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const buffer = Buffer.from(reader.result as ArrayBuffer);
        const inputFileIsBinary = isBinary(file.name, buffer);
        const inputFileData = buffer.toString(inputFileIsBinary ? 'base64' : 'utf-8');
        this.onDataChange({
          inputFileName: file.name,
          inputFileData,
          inputFileIsBinary,
          errorMessage: '',
        });
      };
      reader.readAsArrayBuffer(file);
    }

    onDataChange(data) {
      this.setState(data, () =>
        this.props.onChange(data.inputFileData, data.inputFileIsBinary || false),
      );
    }

    handleFileDrop(_item: unknown, monitor: DropTargetMonitor) {
      if (!monitor) {
        return;
      }
      const file = monitor.getItem<{ files: File[] }>().files[0];
      this.onFileChange(file);
    }

    render() {
      return (
        <FileInput
          {...this.props}
          errorMessage={this.state.errorMessage}
          onDrop={this.handleFileDrop}
          onFileChange={this.onFileChange}
          onDataChange={(inputFileData) => this.onDataChange({ ...this.state, inputFileData })}
          inputFileData={this.state.inputFileData}
          inputFileName={this.state.inputFileName}
          fileIsBinary={this.state.inputFileIsBinary}
          hideContents={this.state.inputFileIsBinary}
        />
      );
    }
  },
);

export const DroppableFileInput = withTranslation()(DroppableFileInputWithTranslation);

export type DroppableFileInputProps = WithTranslation & {
  inputFileData: string;
  onChange: Function;
  label: string;
  id: string;
  inputFieldHelpText: string;
  textareaFieldHelpText: string;
  isRequired: boolean;
  hideContents?: boolean;
  inputFileIsBinary?: boolean;
};

export type DroppableFileInputState = {
  inputFileData: string;
  inputFileIsBinary?: boolean;
  inputFileName: string;
  errorMessage?: any;
};

export type FileInputState = {
  inputFileData: string;
  inputFileName: string;
};

export type FileInputProps = WithTranslation & {
  errorMessage: string;
  isOver?: boolean;
  canDrop?: boolean;
  onDrop: (props: FileInputProps, monitor: DropTargetMonitor) => void;
  inputFileData: string;
  inputFileName: string;
  onFileChange: (file: File) => void;
  onDataChange: (data: string) => void;
  label: string;
  id: string;
  inputFieldHelpText: string;
  textareaFieldHelpText: string;
  isRequired: boolean;
  hideContents?: boolean;
  fileIsBinary?: boolean;
  'data-test-id'?: string;
};
