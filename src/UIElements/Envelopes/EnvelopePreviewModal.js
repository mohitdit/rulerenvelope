import React, { useEffect, useState } from 'react';
import { MdCancel } from 'react-icons/md';
import EnvelopeGroupListDS from '../../DataServices/EnvelopeGroupListDS';
import { Rnd } from 'react-rnd';
import { useCustomContext } from '../CustomComponents/CustomComponents';

const EnvelopePreviewModal = ({ envelopeType, close, ispreviewOpen }) => {
    const [envelopeData, setEnvelopeData] = useState({});
    const { hud, stopHudRotation } = useCustomContext();
    const [windowRect, setWindowRect] = useState(null);
    const groupIDs = ["68b81a68457a8f304588e5e2", "696f587d69425f30837e3824"];

    useEffect(() => {
        if (envelopeType) {
            getGroupSections()
        }
    }, [envelopeType])

    useEffect(() => {
        const win = getWindowSection();
        if (win) {
            setWindowRect({
                x: inchesToPixels(win.sectionX),
                y: inchesToPixels(win.sectionY),
                width: inchesToPixels(win.sectionWidth),
                height: inchesToPixels(win.sectionHeight),
            });
        }
    }, [envelopeData]);

    const getWindowSection = () => {
        if (!envelopeData.Sections || envelopeData.Sections.length === 0) return null;
        if (envelopeData.Sections.length === 1) {
            return envelopeData.Sections[0];
        }
        return envelopeData.Sections.find(s => s.sectionType === 'window');
    };

    const inchesToPixels = (inches) => {
        return inches * 96;
    };


    const getGroupSections = async () => {
        hud("Please Wait")
        const groupID = envelopeType === 'regular-window' ? groupIDs[0] : groupIDs[1];
        ; const requestData = {
            id: groupID,
        };
        try {
            const envelopeGroupDS = new EnvelopeGroupListDS(groupSectionSuccessResponse.bind(this), groupSectionFailureResponse.bind(this));
            envelopeGroupDS.getEnvelopeSections(requestData);
        } catch (error) {
            console.error("Failed to fetch envelopes:", error);
        }
    }

    function groupSectionSuccessResponse(response) {
        setEnvelopeData(response.data);
        stopHudRotation();
    }

    function groupSectionFailureResponse(response) {
        stopHudRotation();
    }

    console.log("ispreview", ispreviewOpen)

    return (
        <div
            style={{
                position: 'absolute',
                marginTop: ispreviewOpen ? "3px" : "0px",
                marginLeft: ispreviewOpen ? "83px" : '0px',
                top: 0,
                background: 'rgba(0,0,0,0.4)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                overflow: 'visible',
                justifyContent: 'center',
            }}
        >

            {/* ENVELOPE CONTAINER */}
            <div style={{ position: 'relative' }}>
                {windowRect && <MdCancel size={24} onClick={close} cursor={'pointer'} style={{ position: 'absolute', right: '0', top: '0', margin: '7px', color: '#09c' }} />}

                {/* SVG ENVELOPE WITH REAL HOLE */}
                {windowRect && (
                    <svg
                        width={inchesToPixels(envelopeData.envelopeWidth)}
                        height={inchesToPixels(envelopeData.envelopeHeight)}
                        style={{ display: 'block' }}
                    >
                        <defs>
                            <mask id="windowMask">
                                {/* Full envelope */}
                                <rect width="100%" height="100%" fill="white" />

                                {/* Transparent window */}
                                {(() => {
                                    const win = getWindowSection();
                                    if (!win) return null;

                                    return (
                                        <rect
                                            x={inchesToPixels(win.sectionX)}
                                            y={inchesToPixels(win.sectionY)}
                                            width={inchesToPixels(win.sectionWidth)}
                                            height={inchesToPixels(win.sectionHeight)}
                                            rx="10"
                                            ry="10"
                                            fill="black"
                                        />
                                    );
                                })()}

                            </mask>
                        </defs>

                        <rect
                            width="100%"
                            height="100%"
                            fill="#FFFFFF"
                            stroke="#000"
                            mask="url(#windowMask)"
                        />
                    </svg>
                )}

                {/* DRAGGABLE WINDOW PREVIEW */}
                {windowRect && (
                    <Rnd
                        size={{
                            width: windowRect.width,
                            height: windowRect.height,
                        }}
                        position={{
                            x: windowRect.x,
                            y: windowRect.y,
                        }}
                        disableDragging={true}
                        bounds="parent"
                        enableResizing={false}
                        style={{
                            position: 'absolute',
                            border: '2px dashed #000',
                            borderRadius: '10px',
                            background: 'transparent',
                            pointerEvents: 'auto',
                        }}
                    />
                )}
            </div>
        </div>
    );


}
export default EnvelopePreviewModal;