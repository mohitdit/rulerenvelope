import React, { useState, useEffect, useRef } from 'react';
import { MdCancel } from 'react-icons/md';
import { useCustomContext } from '../CustomComponents/CustomComponents';
import EnvelopeDS from '../../DataServices/EnvelopeDS';
import ClientDS from '../../DataServices/ClientDS';
import EnvelopeGroupListDS from '../../DataServices/EnvelopeGroupListDS';
import { Tooltip } from 'antd';
import './Envelope.css'

function AddEnvelope({ onClose, onSave, title, envelopesList, activeTab, userId, isClient }) {
    const [envelopeData, setEnvelopeData] = useState({
        envelopeName: '',
        envelopeID: '',
        clientID: '',
        clientName: '',
        envelopeGroupID: '',
        envelopeGroupName: '',
        envelopeColor: true,
        pageType: 1,
        masterPageID: '',
    });
    const [clients, setClients] = useState([]);
    const [groups, setGroups] = useState([]);
    const [masterPages, setMasterPages] = useState([]);
    const [selectedMasterPage, setSelectedMasterPage] = useState(null);
    const loggedEmail = localStorage.getItem('email');
    const { showAlert, hud, stopHudRotation } = useCustomContext();
    const [clientSearchTerm, setClientSearchTerm] = useState('');
    const [groupSearchTerm, setGroupSearchTerm] = useState('');
    const [masterPageSearchTerm, setMasterPageSearchTerm] = useState('');
    const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
    const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);
    const [isMasterPageDropdownOpen, setIsMasterPageDropdownOpen] = useState(false);
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
                setIsMasterPageDropdownOpen(false);
                setIsDatasetDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

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

    useEffect(() => {
        // Filter master pages based on the selected client and pageType = 2
        if (envelopeData.clientID) {
            const filteredMasterPages = envelopesList.filter(
                envelope =>
                    envelope.clientID === envelopeData.clientID && envelope.pageType === 2
            );
            setMasterPages(filteredMasterPages);
        } else {
            setMasterPages([]);
        }
    }, [envelopeData.clientID, envelopesList]);

    useEffect(() => {

        if (activeTab === "All" || activeTab === "Simple") {
            envelopeData.pageType = 1;
        } else if (activeTab === "Master" || activeTab === "Master-Child") {
            envelopeData.pageType = 2;
        } else if (activeTab === "Child") {
            envelopeData.pageType = 3;
        } else {
            envelopeData.pageType = 1; // Default fallback
        }

    }, [activeTab]);

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

    const fetchDatasetNames = async () => {
        hud("Please wait...")
        try {
            const datasetDS = new EnvelopeDS(DatasetNamesSuccessResponse.bind(this), DatasetNamesFailureResponse.bind(this));
            datasetDS.datasetNamesGet({});
        } catch (error) {
            showAlert('Error parsing data', [
                {
                    label: 'Ok',
                    onClick: () => { },
                    color: 'var(--buttonColor)',
                },
            ]);
        }
    };

    function DatasetNamesSuccessResponse(response) {
        stopHudRotation();
        setDatasetList(response.datasets);
        setDatasetFetched(true);
    }

    function DatasetNamesFailureResponse(error) {
        stopHudRotation();
        showAlert(error, [
            {
                label: 'Ok',
                onClick: () => { },
                color: 'var(--buttonColor)',
            },
        ]);
    }


    const fetchEnvelopesAdd = async () => {
        const currentTimestamp = new Date().toISOString();
        hud("Please Wait...");
        console.log("master", masterPages)

        const requestData = {
            envelopeName: envelopeData.envelopeName,
            envelopeGroupID: envelopeData.envelopeGroupID,
            clientID: envelopeData.clientID,
            s3FilePath: '', // You might want to set this or remove if not required
            isColor: envelopeData.envelopeColor,
            pageType: envelopeData.pageType,
            envelopeAddedBy: loggedEmail,
            isEnvelopeDeleted: false,
            isEnvelopeEnable: true,
            envelopeAddedTimeStamp: currentTimestamp,
            envelopeUpdatedTimeStamp: currentTimestamp,
            datasetID: envelopeData.datasetID || '',
            datasetName: envelopeData.datasetName || '',
            // masterPageID: selectedMasterPage._id,
            // envelopeGroupID: selectedMasterPage.envelopeGroupID
        };
        if (envelopeData.pageType === 3 && masterPages.length > 0) {
            console.log("masterpages", masterPages);
            requestData.masterPageID = selectedMasterPage._id;
            requestData.envelopeGroupID = selectedMasterPage.envelopeGroupID;
        };

        try {
            console.log("request data", requestData);
            const EnvelopeAddDS = new EnvelopeDS(EnvelopeAddDataSuccessResponse.bind(this), EnvelopeAddDataFailureResponse.bind(this));
            EnvelopeAddDS.addEnvelope(requestData);
        }
        catch (error) {
            stopHudRotation();
            console.error("Failed to add envelope:", error);
        }

    };

    function EnvelopeAddDataSuccessResponse(response) {
        stopHudRotation();
        console.log("req-envelope", response);
        if (response) {
            const newEnvelope = {
                envelopeID: response.envelopeID,
                envelopeName: envelopeData.envelopeName,
                clientID: envelopeData.clientID,
                clientName: envelopeData.clientName,
                envelopeGroupID: envelopeData.envelopeGroupID,
                envelopeGroupName: envelopeData.envelopeGroupName,
                pageType: envelopeData.pageType,
                isEnvelopeEnable: true,
                s3FilePath: '',
                isColor: envelopeData.envelopeColor
            };
            if (envelopeData.pageType === 3 && masterPages.length > 0) {
                newEnvelope.masterPageID = selectedMasterPage._id;
                newEnvelope.envelopeGroupID = selectedMasterPage.envelopeGroupID;
            };
            console.log("master", masterPages);
            onSave(newEnvelope);
            console.log('newenv', newEnvelope);

            onClose();
        } else {
            showAlert('Failed to add envelope', [
                {
                    label: 'Ok',
                    onClick: () => { },
                    color: 'var(--buttonColor)',
                },
            ]);
        }
    }

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

    const handleChange = (e) => {
        const { name, value } = e.target;
        const updatedValue = name === 'pageType' ? parseInt(value) : value;
        setEnvelopeData(prevData => {
            const updatedData = { [name]: updatedValue };

            if (name === 'clientID') {
                const selectedClient = clients.find(client => client.clientID === value);
                return {
                    ...prevData,
                    ...updatedData,
                    clientName: selectedClient ? selectedClient.clientName : ''
                };
            } else if (name === 'envelopeGroupID') {
                const selectedGroup = groups.find(group => group.envelopeGroupID === value);
                return {
                    ...prevData,
                    ...updatedData,
                    envelopeGroupName: selectedGroup ? selectedGroup.envelopeGroupName : ''
                };
            }

            return {
                ...prevData,
                ...updatedData
            };
        });
    };

    const handleMasterPageSelection = (e) => {
        const selectedMasterPageID = e.target.value;
        const selectedMaster = masterPages.find(page => page._id === selectedMasterPageID);
        setSelectedMasterPage(selectedMaster);
        setEnvelopeData(prevState => ({
            ...prevState,
            masterPageID: selectedMasterPageID,
        }));
    };
    const handleSubmit = (e) => {
        e.preventDefault();
        const newEnvelopeName = (envelopeData.envelopeName || '').trim().toUpperCase();

        const { clientID, envelopeGroupID } = envelopeData;
        if (!newEnvelopeName.trim() || !clientID || (envelopeData.pageType !== 3 && !envelopeGroupID)) {
            showAlert('Please fill in the Envelope name, Client, and Envelope Group.', [
                { label: 'Ok', onClick: () => { }, color: 'var(--buttonColor)' },
            ]);
            return;
        }

        if (envelopeData.pageType === 3 && !envelopeData.masterPageID) {
            showAlert('Please select a master page for the child page.', [
                { label: 'Ok', onClick: () => { }, color: 'var(--buttonColor)' },
            ]);
            return;
        }

        const envelopeExists = envelopesList.some(envelope =>
            (envelope.envelopeName || '').trim().toUpperCase() === newEnvelopeName
        );

        if (envelopeExists) {
            showAlert('Envelope already exists', [
                {
                    label: 'Ok',
                    onClick: () => { },
                    color: 'var(--buttonColor)',
                },
            ]);
        } else {
            fetchEnvelopesAdd();
            // console.log(' envelopeData.envelopeGroupID', envelopeData.envelopeGroupID,)
        }
    };

    const filteredClients = clients.filter(client =>
        client.isClientEnable === true &&
        client.clientName.toLowerCase().includes(clientSearchTerm.toLowerCase())
    );

    const filteredGroups = groups.filter(group =>
        group.envelopeGroupName.toLowerCase().includes(groupSearchTerm.toLowerCase())
    );

    const filteredMasterPages = masterPages.filter(page =>
        page.envelopeName.toLowerCase().includes(masterPageSearchTerm.toLowerCase())
    );

    // ADD THESE SORTING FUNCTIONS HERE:
    const sortAlphanumerically = (array, key) => {
        return array.sort((a, b) => {
            const aValue = a[key] || '';
            const bValue = b[key] || '';

            // Check if strings start with numbers
            const aStartsWithNumber = /^\d/.test(aValue);
            const bStartsWithNumber = /^\d/.test(bValue);

            // Numbers first, then alphabetical
            if (aStartsWithNumber && !bStartsWithNumber) return -1;
            if (!aStartsWithNumber && bStartsWithNumber) return 1;

            // Both are numbers or both are letters - sort alphabetically
            return aValue.localeCompare(bValue, undefined, { numeric: true, sensitivity: 'base' });
        });
    };

    const sortedClients = sortAlphanumerically([...filteredClients], 'clientName');
    const sortedGroups = sortAlphanumerically([...filteredGroups], 'envelopeGroupName');
    const sortedMasterPages = sortAlphanumerically([...filteredMasterPages], 'envelopeName');

    return (
        <div className="modal-overlay">
            <div className="modal-content-envelope">
                <div className="modal-header">
                    <span className="modal-title">{title}</span>
                    <MdCancel className='close-modal' size={24} onClick={onClose} />
                </div>

                <form onSubmit={handleSubmit} className='envelope-form'>

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
                        <label>
                            <input
                                type="radio"
                                name="pageType"
                                value={3}
                                className='form-radio'
                                checked={envelopeData.pageType === 3}
                                onChange={handleChange}
                            />
                            Child Page
                        </label>
                    </div>
                    <div>
                        <label>Envelope Name</label>
                        <input
                            type="text"
                            name="envelopeName"
                            className="form-control"
                            value={envelopeData.envelopeName}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    {/* Client Name Dropdown with Search */}
                    <div className=' envelope-searchable-dropdown-wrapper' ref={isClientDropdownOpen ? dropdownRef : null}>
                        <label>Client Name</label>
                        <button
                            type="button"
                            disabled={isClient}
                            onClick={() => {
                                if (isClient) return;  // extra safety
                                setIsClientDropdownOpen(!isClientDropdownOpen);
                                setIsGroupDropdownOpen(false);
                                setIsMasterPageDropdownOpen(false);
                            }}
                            className={`envelope-searchable-dropdown-button 
        ${isClient ? 'disabled-dropdown' : ''} 
        ${isClientDropdownOpen ? 'envelope-searchable-dropdown-button-open' : ''}
    `} ref={dropdownRef}
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
                                    className="envelope-searchable-dropdown-search"
                                    onClick={(e) => e.stopPropagation()}
                                />
                                <div className="search-data">
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

                            </div>
                        )}
                    </div>

                    {/* Envelope Group Name Dropdown with Search */}
                    {envelopeData.pageType !== 3 && (
                        <div className='addEnvelope-input envelope-searchable-dropdown-wrapper' ref={isGroupDropdownOpen ? dropdownRef : null}>
                            <label>Envelope Group Name</label>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsGroupDropdownOpen(!isGroupDropdownOpen);
                                    setIsClientDropdownOpen(false);
                                    setIsMasterPageDropdownOpen(false);
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
                                    <div className="search-data">
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

                                </div>
                            )}
                        </div>
                    )}

                    {/* Master Page Dropdown with Search */}
                    {envelopeData.pageType === 3 && (
                        <div className='addEnvelope-input envelope-searchable-dropdown-wrapper' ref={isMasterPageDropdownOpen ? dropdownRef : null}>
                            <label>Master Page</label>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsMasterPageDropdownOpen(!isMasterPageDropdownOpen);
                                    setIsClientDropdownOpen(false);
                                    setIsGroupDropdownOpen(false);
                                }}
                                className={`envelope-searchable-dropdown-button ${isMasterPageDropdownOpen ? 'envelope-searchable-dropdown-button-open' : ''}`}
                            >
                                {selectedMasterPage?.envelopeName || 'Select Master Page'}
                            </button>
                            {isMasterPageDropdownOpen && (
                                <div
                                    className="envelope-searchable-dropdown-panel"
                                >
                                    <input
                                        type="text"
                                        placeholder="Search master page..."
                                        value={masterPageSearchTerm}
                                        onChange={(e) => setMasterPageSearchTerm(e.target.value)}
                                        autoComplete="off"
                                        className="envelope-searchable-dropdown-search"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                    {sortedMasterPages && sortedMasterPages.length > 0 ? (
                                        sortedMasterPages.map(masterPage => (
                                            <Tooltip
                                                key={masterPage._id}
                                                title={
                                                    <div>{masterPage.envelopeName}</div>
                                                }
                                                placement="right"
                                            >
                                                <div
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setSelectedMasterPage(masterPage);
                                                        setEnvelopeData(prevData => ({
                                                            ...prevData,
                                                            masterPageID: masterPage._id
                                                        }));
                                                        setIsMasterPageDropdownOpen(false);
                                                        setMasterPageSearchTerm('');
                                                    }}
                                                    className="envelope-searchable-dropdown-item"
                                                >
                                                    {masterPage.envelopeName}
                                                </div>
                                            </Tooltip>
                                        ))
                                    ) : (
                                        <div className="envelope-searchable-dropdown-empty">
                                            No Master Pages Available
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>


                    )}

                    {/* Dataset Name Dropdown with Search */}
                    {envelopeData.pageType != 2 && <div className='addEnvelope-input envelope-searchable-dropdown-wrapper' ref={isDatasetDropdownOpen ? dropdownRef : null}>
                        <label>Dataset Name<span style={{ fontSize: '12px', color: 'gray' }}></span></label>
                        <button
                            type="button"
                            onClick={() => {
                                if (!datasetFetched) { fetchDatasetNames(); }

                                setIsDatasetDropdownOpen(!isDatasetDropdownOpen);
                                setIsClientDropdownOpen(false);
                                setIsGroupDropdownOpen(false);
                                setIsMasterPageDropdownOpen(false);
                            }}
                            className={`envelope-searchable-dropdown-button ${isDatasetDropdownOpen ? 'envelope-searchable-dropdown-button-open' : ''}`}
                        >
                            {envelopeData.datasetName || 'Select Dataset'}
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
                                <div className="search-data">
                                    {datasetList.filter(d =>
                                        d['dataset-name'].toLowerCase().includes(datasetSearchTerm.toLowerCase())
                                    ).length > 0 ? (
                                        datasetList
                                            .filter(d => d['dataset-name'].toLowerCase().includes(datasetSearchTerm.toLowerCase()))
                                            .map(dataset => (
                                                <div
                                                    key={dataset._id}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setEnvelopeData(prevData => ({
                                                            ...prevData,
                                                            datasetID: dataset['dataset-id'],
                                                            datasetName: dataset['dataset-name']
                                                        }));
                                                        setIsDatasetDropdownOpen(false);
                                                        setDatasetSearchTerm('');
                                                    }}
                                                    className="envelope-searchable-dropdown-item"
                                                >
                                                    {dataset['dataset-name']}
                                                </div>
                                            ))
                                    ) : (
                                        <div className="envelope-searchable-dropdown-empty">
                                            No Datasets Available
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    }

                    {/* <div className='radio-div'>
                        <label>Envelope Color</label>
                        <label className='radio-label'>
                            <input
                                type="radio"
                                name="envelopeColor"
                                className='form-radio'
                                value={true}
                                checked={envelopeData.envelopeColor === true}
                                onChange={() => setEnvelopeData(prevData => ({ ...prevData, envelopeColor: true }))}
                            />
                            Color
                        </label>
                        <label>
                            <input
                                type="radio"
                                name="envelopeColor"
                                className='form-radio'
                                value={false}
                                checked={envelopeData.envelopeColor === false}
                                onChange={() => setEnvelopeData(prevData => ({ ...prevData, envelopeColor: false }))}
                            />
                            Black & White
                        </label>
                    </div> */}

                    <div className="button-group-btn">
                        <button type="submit">Submit</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AddEnvelope;
