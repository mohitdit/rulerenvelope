import React, { useState } from 'react';
import { MdCancel } from 'react-icons/md';
import './preview.css';
import EnvelopePreviewModal from './EnvelopePreviewModal';

const PdfPreviewModal = ({ pdfUrl, title, onClose, isEnvelope,ispreviewOpen}) => {
  const [showEnvelopeModal, setShowEnvelopeModal] = useState(false);
  const [selectedPreviewType, setSelectedPreviewType] = useState('');
  const AWS = require('aws-sdk');
  const s3 = new AWS.S3({
    region: process.env.REACT_APP_AWS_REGION,
    accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY,
    secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY,
  });

  const params = {
    Bucket: process.env.REACT_APP_S3_BUCKET_NAME,
    Key: pdfUrl,
    Expires: 60 * 60,
  };

  const signedUrl = s3.getSignedUrl('getObject', params);


  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-content-preview">
        <div className="modal-header">
          <h2 id="modal-title" className="modal-title">{title}</h2>
          {!isEnvelope && <div style={{ position: 'absolute', right: '0', marginRight: '40px' }}>
            <button className='preview_trigger' onClick={() => {
              setSelectedPreviewType('regular-window')
              setShowEnvelopeModal(true);
            }}>Regular Window</button>

            <button className='preview_trigger' onClick={() => {
              setSelectedPreviewType('full-window')
              setShowEnvelopeModal(true);
            }}>Full Window</button>
          </div>}
          <MdCancel className="close-modal" size={24} onClick={onClose} />
        </div>

        <div className="modal-body-preview" style={{ position: 'relative' }}>

          <embed
            src={`${signedUrl}#toolbar=0&navpanes=0&scrollbar=0&zoom=100`}
            title="PDF Preview"
            className="iframe-preview"
          />
          {showEnvelopeModal && <EnvelopePreviewModal envelopeType={selectedPreviewType} close={() => setShowEnvelopeModal(false)} ispreviewOpen={ispreviewOpen} />}
        </div>
      </div>
    </div>
  );
};

export default PdfPreviewModal;
