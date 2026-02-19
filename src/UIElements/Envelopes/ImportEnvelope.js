import React, { useEffect, useState, useRef } from 'react';
import { MdCancel } from 'react-icons/md';
import DocxPreviewer from './DocxPreview'
import EnvelopeDS from '../../DataServices/EnvelopeDS';
import { useCustomContext } from '../CustomComponents/CustomComponents';
import EnvelopeGroupListDS from '../../DataServices/EnvelopeGroupListDS';
import ClientDS from '../../DataServices/ClientDS';

import AWS from 'aws-sdk';


const s3 = new AWS.S3({
  region: process.env.REACT_APP_AWS_REGION,
  accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY,
  secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY,
});


function ImportEnvelope({ onClose, title, userId, isClient, setIsClientCall }) {
  const [envelopeName, setEnvelopeName] = useState('');
  const [importedFile, setImportedFile] = useState(null);
  const [envelopeId, setEnvelopeId] = useState();
  const [errorMessages, setErrorMessages] = useState({
    envelopeName: '',
    envelopeFile: ''
  });
  const loggedEmail = localStorage.getItem('email')
  const { showAlert, hud, stopHudRotation } = useCustomContext();
  const [openConverter, setOpenConverter] = useState(false);
  const [elements, setElements] = useState([]);
  const [clients, setClients] = useState([]);
  const [groups, setGroups] = useState([]);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [groupSearchTerm, setGroupSearchTerm] = useState('');
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);
  const [envelopeData, setEnvelopeData] = useState({
    envelopeName: '',
    envelopeID: '',
    clientID: '',
    clientName: '',
    pageType: 1,
    envelopeGroupID: '',
    envelopeGroupName: '',
  });
  const [isDatasetDropdownOpen, setIsDatasetDropdownOpen] = useState(false);
  const [datasetList, setDatasetList] = useState([]);
  const [datasetSearchTerm, setDatasetSearchTerm] = useState('');
  const [datasetFetched, setDatasetFetched] = useState(false);
  const dropdownRef = useRef(null);
    useEffect(() => {
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsClientDropdownOpen(false);
                setIsGroupDropdownOpen(false);
                setIsDatasetDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

  useEffect(() => {
    console.log('elements1234:', elements);
  }, [elements])
  useEffect(() => {
    if (isClient && userId && clients.length > 0) {
      const selectedClient = clients.find(c => c._id === userId);

      if (selectedClient) {
        setEnvelopeData(prev => ({
          ...prev,
          clientID: selectedClient._id,
          clientName: selectedClient.clientName
        }));
      }
    }
  }, [isClient, userId, clients]);

  useEffect(() => {
    fetchClients();
    fetchEnvelopeGroupList();
  }, []);


  async function fetchBlobFromBlobUrl(blobUrl) {
    const response = await fetch(blobUrl);
    return await response.blob();
  }

  async function uploadToS3(blob, keyName) {
    const params = {
      Bucket: process.env.REACT_APP_S3_BUCKET_NAME,
      Key: keyName,
      Body: blob,
      ContentType: blob.type,
    };

    const { Location } = await s3.upload(params).promise();
    return Location;
  }


  const handleImageContentUpdate = async (clientId, pageType) => {
    console.log("pageType:", pageType);
    const pagesToUpdate = pageType === 2
      ? elements.filter(page => page.pageNumber === 1)
      : elements;
    const updatedElements = await Promise.all(
      pagesToUpdate.map(async (page) => {
        const key = `customelements${page.pageNumber}`;
        if (page[key] && Array.isArray(page[key].elements)) {
          const updatedPageElements = await Promise.all(
            page[key].elements.map(async (el) => {
              if (!el || el.type !== 'image' || !el.content) return el;

              let newContent = el.content;
              const blobUrls = [...newContent.matchAll(/src="(blob:[^"]+)"/g)].map(match => match[1]);

              for (const blobUrl of blobUrls) {
                const now = new Date();
                const randomSuffix = Math.random().toString(36).substring(2, 8); // 6-char random string

                const timestamp = `${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${now.getFullYear()}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}${String(now.getMilliseconds()).padStart(3, '0')}`;
                const newFileName = `Importedimage_${timestamp}_${randomSuffix}`;
                const keyName = `Clients/${clientId}/photoLibrary/${newFileName}.png`;

                try {
                  const blob = await fetchBlobFromBlobUrl(blobUrl);
                  const s3Url = await uploadToS3(blob, keyName);
                  newContent = keyName;
                  console.log("✅ Uploaded to S3:", s3Url);
                } catch (err) {
                  console.error(`❌ Failed to upload image for URL ${blobUrl}:`, err);
                }
              }

              return {
                ...el,
                content: newContent
              };
            })
          );

          return {
            ...page,
            [key]: {
              ...page[key],
              elements: updatedPageElements
            }
          };
        }

        return page;
      })
    );

    return updatedElements;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updatedValue = name === 'pageType' ? parseInt(value) : value;
    setEnvelopeData(prevData => {

      let updatedData = { ...prevData, [name]: value, [name]: updatedValue };

      if (name === 'clientID') {
        const selectedClient = clients.find(client => client._id === value);
        updatedData.clientName = selectedClient?.clientName || '';
      } else if (name === 'envelopeGroupID') {
        const selectedGroup = groups.find(group => group._id === value);
        updatedData.envelopeGroupName = selectedGroup?.envelopeGroupName || '';
      }

      return updatedData;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = {};

    if (!envelopeName.trim()) {
      errors.envelopeName = 'Please enter envelope name';
    }

    if (!importedFile) {
      errors.envelopeFile = 'Please upload the docx file';
    }

    if (!envelopeData.clientID) {
      errors.envelopeClient = 'Please select a client';
    }

    if (!envelopeData.envelopeGroupID) {
      errors.envelopeGroup = 'Please select a group';
    }

    setErrorMessages(errors);
    if (Object.keys(errors).length > 0) return;

    const updatedElements = await handleImageContentUpdate(envelopeData.clientID, envelopeData.pageType);
    setElements(updatedElements);

    fetchEnvelopesAdd(envelopeData.clientID, envelopeData.envelopeGroupID, updatedElements);
    setIsClientCall(false)
  };


  const fetchClients = async () => {
    hud("Please Wait...");
    try {
      const clientDS = new ClientDS(
        ClientDataSuccessResponse.bind(this),
        ClientDataFailureResponse.bind(this)
      );
      clientDS.fetchClients();
    } catch (error) {
      stopHudRotation();
      console.error("Failed to fetch clients:", error);
      showAlert('Failed to fetch client data. Please try again.', [
        {
          label: 'Ok',
          onClick: () => { },
          color: 'var(--buttonColor)',
        },
      ]);
    }
  };


  function ClientDataSuccessResponse(response) {
    stopHudRotation();
    if (response) {
      try {
        const data = response;
        setClients(data);
      } catch (parseError) {
        showAlert('Error parsing client data', [
          {
            label: 'Ok',
            onClick: () => { },
            color: 'var(--buttonColor)',
          },
        ]);
      }
    } else {
      showAlert('No Clients Available', [
        {
          label: 'Ok',
          onClick: () => { },
          color: 'var(--buttonColor)',
        },
      ]);
    }
  }

  function ClientDataFailureResponse(error) {
    stopHudRotation();
    console.error('Something went wrong:', error);
    showAlert(error, [
      {
        label: 'Ok',
        onClick: () => { },
        color: 'var(--buttonColor)',
      },
    ]);
  }



  const fetchEnvelopeGroupList = async () => {
    hud("Please Wait...");
    try {
      const envelopeGroupDS = new EnvelopeGroupListDS(
        EnvelopeGroupListDataSuccessResponse.bind(this),
        EnvelopeGroupListDataFailureResponse.bind(this)
      );
      envelopeGroupDS.fetchEnvelopeGroupListsGet();
    } catch (error) {
      console.error("Failed to fetch envelope groups:", error);
    }
  };

  function EnvelopeGroupListDataSuccessResponse(response) {
    stopHudRotation();
    if (response) {
      try {
        const data = response;
        setGroups(data);
      } catch (parseError) {
        showAlert('Error parsing envelope group data', [
          {
            label: 'Ok',
            onClick: () => { },
            color: 'var(--buttonColor)',
          },
        ]);
      }
    } else {
      showAlert('No Envelope Groups Available', [
        {
          label: 'Ok',
          onClick: () => { },
          color: 'var(--buttonColor)',
        },
      ]);
    }
  }

  function EnvelopeGroupListDataFailureResponse(error) {
    stopHudRotation();
    console.error('Something went wrong:', error);
    showAlert(error, [
      {
        label: 'Ok',
        onClick: () => { },
        color: 'var(--buttonColor)',
      },
    ]);
  }

  const fetchEnvelopesAdd = async (clientID, groupID, updatedElements) => {
    const currentTimestamp = new Date().toISOString();
    hud("Please Wait...");

    const requestData = {
      envelopeName: envelopeName,
      envelopeGroupID: groupID,
      clientID: clientID,
      s3FilePath: '',
      isColor: false,
      pageType: envelopeData.pageType,
      envelopeAddedBy: loggedEmail,
      isEnvelopeDeleted: false,
      isEnvelopeEnable: true,
      envelopeAddedTimeStamp: currentTimestamp,
      envelopeUpdatedTimeStamp: currentTimestamp,
    };

    try {
      const EnvelopeAddDS = new EnvelopeDS(
        (response) => {
          const envelopeId = response.envelopeID;
          if (envelopeId) {
            EnvelopeCustomAdd(envelopeId, updatedElements);
          } else {
            stopHudRotation();
            console.error("❌ No envelope ID returned from envelope creation.");
          }
        },
        EnvelopeAddDataFailureResponse.bind(this)
      );
      EnvelopeAddDS.addEnvelope(requestData);
    } catch (error) {
      stopHudRotation();
      console.error("Failed to add envelope:", error);
    }
  };


  function EnvelopeAddDataFailureResponse(error) {
    stopHudRotation();
    console.error('Something went wrong:', error);
    showAlert(error, [
      {
        label: 'Ok',
        onClick: () => { },
        color: 'var(--buttonColor)',
      },
    ]);
  }
  const EnvelopeCustomAdd = async (envelopeId, updatedElements) => {
    const customSectionId = localStorage.getItem('email');

    const requestData = {
      envelopeId: envelopeId,
      customSectionUpdatedTimeStamp: new Date().toISOString(),
      customSectionAddedBy: customSectionId,
      customElements: updatedElements, // 👈 Using updated elements
      pdfCustomElements: '',
    };

    console.log("req-master", requestData);

    try {
      const envelopeGroupDS = new EnvelopeGroupListDS(
        (response) => handleSuccess(response),
        handleFailure
      );
      envelopeGroupDS.envelopeElementsADD(requestData);
    } catch (error) {
      console.error("Failed to add custom envelope elements:", error);
    }
  };


  const handleSuccess = (response) => {
    stopHudRotation();
    console.log(response);
    onClose();

  };

  const handleFailure = (error) => {
    stopHudRotation();
    showAlert(error, [{ label: 'Ok', color: "#09c", onClick: () => { } }]);
  };

  const handleNameChange = (e) => {
    setEnvelopeName(e.target.value);
    setErrorMessages(prev => ({ ...prev, envelopeName: '' }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];

    // invalid or missing file
    if (
      !file ||
      file.type !==
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      showAlert(
        'Please upload a valid .docx file',
        [{ label: 'Ok', color: 'var(--buttonColor)', onClick: () => { } }]
      );

      //  clear file input
      e.target.value = '';

      // clear existing data
      setImportedFile(null);
      setElements([]);
      setOpenConverter(false);

      return;
    }

    // valid docx
    setImportedFile(file);
    setElements([]);
    setErrorMessages(prev => ({ ...prev, envelopeFile: '' }));
    setOpenConverter(true); // open DocxPreviewer
  };

  const closeEditor = () => {
    setOpenConverter(false)
  }

  const isSubmitDisabled =
    !envelopeName.trim() ||
    !envelopeData.clientID ||
    !envelopeData.envelopeGroupID ||
    !elements ||
    elements.length === 0;

  const filteredClients = clients.filter(client =>
    client.isClientEnable === true &&
    client.clientName.toLowerCase().includes(clientSearchTerm.toLowerCase())
  );

  const filteredGroups = groups.filter(group =>
    group.envelopeGroupName.toLowerCase().includes(groupSearchTerm.toLowerCase())
  );

  const sortAlphanumerically = (array, key) => {
    return array.sort((a, b) => {
      const aValue = a[key] || '';
      const bValue = b[key] || '';

      const aStartsWithNumber = /^\d/.test(aValue);
      const bStartsWithNumber = /^\d/.test(bValue);

      if (aStartsWithNumber && !bStartsWithNumber) return -1;
      if (!aStartsWithNumber && bStartsWithNumber) return 1;

      return aValue.localeCompare(bValue, undefined, { numeric: true, sensitivity: 'base' });
    });
  };

  const sortedClients = sortAlphanumerically([...filteredClients], 'clientName');
  const sortedGroups = sortAlphanumerically([...filteredGroups], 'envelopeGroupName');

  return (
    <div className="modal-overlay">0
      <div className="modal-content-envelope">
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <MdCancel className="close-modal" size={24} onClick={onClose} />
        </div>

        <form onSubmit={handleSubmit} className="envelope-form">
          <div className="page-type-selection">
            <label>Page Type</label>
            <label>
              <input
                type="radio"
                name="pageType"
                value={1}
                className='form-radio'
                checked={envelopeData.pageType === 1}
                onChange={handleChange}
              />
              Simple Page
            </label>
            <label>
              <input
                type="radio"
                name="pageType"
                value={2}
                className='form-radio'
                checked={envelopeData.pageType === 2}
                onChange={handleChange}
              />
              Master Page
            </label>
          </div>
          <div>
            <label>Envelope Name</label>
            <input
              type="text"
              name="envelopeName"
              className="form-control"
              value={envelopeName}
              onChange={handleNameChange}
            />

          </div>
          {errorMessages.envelopeName && (
            <small className="importErrorMessage">{errorMessages.envelopeName}</small>
          )}
          <div className='addEnvelope-input envelope-searchable-dropdown-wrapper' ref={isClientDropdownOpen ? dropdownRef : null}>
            <label>Client Name</label>
            <button
              type="button"
              disabled={isClient}   // 👈 disable if isClient true
              onClick={() => {
                if (isClient) return;  // extra safety
                setIsClientDropdownOpen(!isClientDropdownOpen);
                setIsGroupDropdownOpen(false);

              }}
              className={`envelope-searchable-dropdown-button 
        ${isClient ? 'disabled-dropdown' : ''} 
        ${isClientDropdownOpen ? 'envelope-searchable-dropdown-button-open' : ''}
    `}
            >
              {envelopeData.clientName || 'Select Client'}
            </button>
            {isClientDropdownOpen && !isClient && (

              <div
                className="envelope-searchable-dropdown-panel"
              >
                <input
                  type="text"
                  placeholder="Search client..."
                  value={clientSearchTerm}
                  onChange={(e) => setClientSearchTerm(e.target.value)}
                  autoComplete="off"
                  disabled={isClient}
                  className="envelope-searchable-dropdown-search"
                  onClick={(e) => e.stopPropagation()}
                />
                {sortedClients && sortedClients.length > 0 ? (
                  sortedClients.map(client => (
                    <div
                      key={client._id}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setEnvelopeData(prevData => ({
                          ...prevData,
                          clientID: client._id,
                          clientName: client.clientName
                        }));
                        setIsClientDropdownOpen(false);
                        setClientSearchTerm('');
                      }}
                      className="envelope-searchable-dropdown-item"
                    >
                      {client.clientName}
                    </div>
                  ))
                ) : (
                  <div className="envelope-searchable-dropdown-empty">
                    No Clients Available
                  </div>
                )}
              </div>
            )}
          </div>

          <div className='addEnvelope-input envelope-searchable-dropdown-wrapper' ref={isGroupDropdownOpen ? dropdownRef : null}>
            <label>Envelope Group Name</label>
            <button
              type="button"
              onClick={() => {
                setIsGroupDropdownOpen(!isGroupDropdownOpen);
                setIsClientDropdownOpen(false);
              }}
              className={`envelope-searchable-dropdown-button ${isGroupDropdownOpen ? 'envelope-searchable-dropdown-button-open' : ''}`}
            >
              {envelopeData.envelopeGroupName || 'Select Group'}
            </button>
            {isGroupDropdownOpen && (
              <div
                className="envelope-searchable-dropdown-panel"
              >
                <input
                  type="text"
                  placeholder="Search group..."
                  value={groupSearchTerm}
                  onChange={(e) => setGroupSearchTerm(e.target.value)}
                  autoComplete="off"
                  className="envelope-searchable-dropdown-search"
                  onClick={(e) => e.stopPropagation()}
                />
                {sortedGroups && sortedGroups.length > 0 ? (
                  sortedGroups.map(group => (
                    <div
                      key={group._id}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setEnvelopeData(prevData => ({
                          ...prevData,
                          envelopeGroupID: group._id,
                          envelopeGroupName: group.envelopeGroupName
                        }));
                        setIsGroupDropdownOpen(false);
                        setGroupSearchTerm('');
                      }}
                      className="envelope-searchable-dropdown-item"
                    >
                      {group.envelopeGroupName}
                    </div>
                  ))
                ) : (
                  <div className="envelope-searchable-dropdown-empty">
                    No Groups Available
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Dataset Name Dropdown with Search */}
          <div className='addEnvelope-input envelope-searchable-dropdown-wrapper' ref={isDatasetDropdownOpen ? dropdownRef : null}>
            <label>Dataset Name <span style={{ fontSize: '12px', color: 'gray' }}>(Optional)</span></label>
            <button
              type="button"
              onClick={() => {
                if (!datasetFetched);
                setIsDatasetDropdownOpen(!isDatasetDropdownOpen);
                setIsClientDropdownOpen(false);
                setIsGroupDropdownOpen(false);
              }}
              className={`envelope-searchable-dropdown-button ${isDatasetDropdownOpen ? 'envelope-searchable-dropdown-button-open' : ''}`}
            >
              {envelopeData.datasetName || 'Select Dataset (Optional)'}
            </button>
            {isDatasetDropdownOpen && (
              <div className="envelope-searchable-dropdown-panel">
                <input
                  type="text"
                  placeholder="Search dataset..."
                  value={datasetSearchTerm}
                  onChange={(e) => setDatasetSearchTerm(e.target.value)}
                  autoComplete="off"
                  className="envelope-searchable-dropdown-search"
                  onClick={(e) => e.stopPropagation()}
                />
                {datasetList.filter(d =>
                  d.datasetName.toLowerCase().includes(datasetSearchTerm.toLowerCase())
                ).length > 0 ? (
                  datasetList
                    .filter(d => d.datasetName.toLowerCase().includes(datasetSearchTerm.toLowerCase()))
                    .map(dataset => (
                      <div
                        key={dataset._id}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setEnvelopeData(prevData => ({
                            ...prevData,
                            datasetID: dataset._id,
                            datasetName: dataset.datasetName
                          }));
                          setIsDatasetDropdownOpen(false);
                          setDatasetSearchTerm('');
                        }}
                        className="envelope-searchable-dropdown-item"
                      >
                        {dataset.datasetName}
                      </div>
                    ))
                ) : (
                  <div className="envelope-searchable-dropdown-empty">
                    No Datasets Available
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label>Upload Envelope</label>
            <input
              type="file"
              accept=".docx"
              name="importedFile"
              className="form-control"
              onChange={handleFileChange}
            />
          </div>
          <div style={{ justifyContent: "center", marginTop: "-13px" }}>
            <small className="form-text" style={{ fontSize: "13px", color: "#ff4d4f", marginLeft: "-37px" }}>
              Only [.docx] files are accepted
            </small>
          </div>
          {errorMessages.envelopeFile && (
            <small className="importErrorMessage">{errorMessages.envelopeFile}</small>
          )}
          <div className="button-group-btn">
            <button type="submit" disabled={isSubmitDisabled}
              style={{
                opacity: isSubmitDisabled ? 0.6 : 1,
                cursor: isSubmitDisabled ? 'not-allowed' : 'pointer'
              }}
            >
              Submit
            </button>
          </div>
        </form>
      </div>

      {openConverter && importedFile && (
        <DocxPreviewer file={importedFile} getElements={setElements} onClose={closeEditor} />
      )}

    </div>
  );
}

export default ImportEnvelope;