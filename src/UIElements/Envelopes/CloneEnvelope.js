import React, { useState, useEffect } from 'react';
import { MdCancel } from 'react-icons/md';
import { useCustomContext } from '../CustomComponents/CustomComponents';
import EnvelopeDS from '../../DataServices/EnvelopeDS';
import ClientDS from '../../DataServices/ClientDS';
import './Envelope.css'

function CloneEnvelope({ onClose, onSave, title, envelopesList, selectedEnvelope }) {
    const [envelopeData, setEnvelopeData] = useState({
        envelopeName: '',
        envelopeID: '',
        clientID: '',
        clientName: '',
        envelopeGroupID: '',
        envelopeGroupName: '',
        envelopeColor: true,
    });
    const [clients, setClients] = useState([]);
    const loggedEmail = localStorage.getItem('email');
    const { showAlert, hud, stopHudRotation } = useCustomContext();
    const [clientSearchTerm, setClientSearchTerm] = useState('');
    const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
    const now = new Date();

    useEffect(() => {
        fetchClients();
    }, []);
    const getTimestamp = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const date = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        return `${year}${month}${date}${hours}${minutes}${seconds}`;
    };
    useEffect(() => {
        if (selectedEnvelope) {
            const timestamp = `${String(now.getFullYear())}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
            // const timestamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15); 
            const selectedClient = clients.find(client => client._id === selectedEnvelope.clientID);

            setEnvelopeData({
                ...selectedEnvelope,
                envelopeName: `${selectedEnvelope.envelopeName}-${timestamp}-Clone`,
                envelopeColor: selectedEnvelope.isColor,
                clientName: selectedEnvelope.clientName,
            });

            // Show alert if the client is not enabled
            if (selectedClient && !selectedClient.isClientEnable) {
                showAlert(`Client "${selectedEnvelope.clientName}" is not enabled. Please select another client.`, [
                    {
                        label: "Ok",
                        onClick: () => { },
                        color: 'var(--buttonColor)',
                    },
                ]);
            }
        }
    }, [selectedEnvelope, clients]);

    const fetchClients = async () => {
        hud("Please Wait...");
        try {
            const clientDS = new ClientDS(ClientDataSuccessResponse.bind(this), ClientDataFailureResponse.bind(this));
            clientDS.fetchClients();
        } catch (error) {
            console.error("Failed to fetch clients:", error);
        }
    };

    function ClientDataSuccessResponse(response) {
        stopHudRotation();
        if (response) {
            setClients(response);
        } else {
            showAlert('No Clients Available', [
                { label: 'Ok', onClick: () => { }, color: 'var(--buttonColor)' },
            ]);
        }
    }

    function ClientDataFailureResponse(error) {
        stopHudRotation();
        console.error('Error fetching clients:', error);
        showAlert(error, [
            { label: 'Ok', onClick: () => { }, color: 'var(--buttonColor)' },
        ]);
    }

    const fetchEnvelopesAdd = async () => {
        const currentTimestamp = new Date().toISOString();
        hud("Please Wait...");

        const requestData = {
            _id: selectedEnvelope._id,
            envelopeName: envelopeData.envelopeName,
            clientID: envelopeData.clientID,
            isColor: envelopeData.envelopeColor,
            envelopeAddedBy: loggedEmail,
        };
        try {
            const envelopeCloneDS = new EnvelopeDS(EnvelopeAddDataSuccessResponse.bind(this), EnvelopeAddDataFailureResponse.bind(this));
            envelopeCloneDS.cloneEnvelope(requestData);
        } catch (error) {
            stopHudRotation();
            console.error("Failed to add envelope:", error);
        }
    };

    function EnvelopeAddDataSuccessResponse(response) {
        stopHudRotation();
        if (response) {
            const newEnvelope = {
                envelopeID: response.envelopeID,
                envelopeName: envelopeData.envelopeName,
                clientID: envelopeData.clientID,
                clientName: envelopeData.clientName,
                envelopeGroupID: envelopeData.envelopeGroupID,
                envelopeGroupName: envelopeData.envelopeGroupName,
                isEnvelopeEnable: true,
                s3FilePath: '',
                isColor: envelopeData.envelopeColor,
            };
            onSave(newEnvelope);
            console.log("new envelope", newEnvelope);
            onClose();
        } else {
            showAlert('Failed to add envelope', [
                { label: 'Ok', onClick: () => { }, color: 'var(--buttonColor)' },
            ]);
        }
    }

    function EnvelopeAddDataFailureResponse(error) {
        stopHudRotation();
        console.error('Error adding envelope:', error);
        showAlert(error, [
            { label: 'Ok', onClick: () => { }, color: 'var(--buttonColor)' },
        ]);
    }

    const handleChange = (e) => {
        const { name, value } = e.target;
        setEnvelopeData((prevData) => {
            const updatedData = { [name]: value };

            if (name === 'clientID') {
                const selectedClient = clients.find(client => client._id === value);
                return {
                    ...prevData,
                    ...updatedData,
                    clientName: selectedClient ? selectedClient.clientName : '',
                };
            }

            return { ...prevData, ...updatedData };
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const newEnvelopeName = (envelopeData.envelopeName || '').trim().toUpperCase();
        const { clientID } = envelopeData;

        if (!newEnvelopeName || !clientID) {
            showAlert('Please fill in all required fields.', [
                { label: 'Ok', onClick: () => { }, color: 'var(--buttonColor)' },
            ]);
            return;
        }

        const envelopeExists = envelopesList.some((envelope) => envelope.envelopeName.trim().toUpperCase() === newEnvelopeName);

        if (envelopeExists) {
            showAlert('Envelope already exists', [
                { label: 'Ok', onClick: () => { }, color: 'var(--buttonColor)' },
            ]);
        } else {
            fetchEnvelopesAdd();
        }
    };

    const filteredClients = clients.filter(client =>
        client.isClientEnable === true &&
        client.clientName.toLowerCase().includes(clientSearchTerm.toLowerCase())
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

    return (
        <div className="modal-overlay">
            <div className="modal-content-envelope">
                <div className="modal-header">
                    <span className="modal-title">{title}</span>
                    <MdCancel className="close-modal" size={24} onClick={onClose} />
                </div>

                <form onSubmit={handleSubmit} className="envelope-form">
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

                    <div className="envelope-searchable-dropdown-wrapper" style={{ marginBottom: '15px' }}>
                        <label>Client Name</label>
                        <button
                            type="button"
                            onClick={() => {
                                setIsClientDropdownOpen(!isClientDropdownOpen);
                            }}
                            className={`envelope-searchable-dropdown-button ${isClientDropdownOpen ? 'envelope-searchable-dropdown-button-open' : ''}`}
                        >
                            {envelopeData.clientName || 'Select Client'}
                        </button>
                        {isClientDropdownOpen && (
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
                                            className="envelope-searchable-dropdown-item envelope-searchable-dropdown-item--dark"
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

                    <div className="button-group-btn">
                        <button type="submit">Submit</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default CloneEnvelope;