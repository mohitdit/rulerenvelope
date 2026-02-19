
import Api from '../ApiUtility/Api'

class EnvelopeDS {

    constructor(successCallBack, failureCallBack){
        console.log("constructor called...")
        this.api = new Api(this.EnvelopeDSSuccess.bind(this), this.EnvelopeDSFailure.bind(this))
        this.successDSCallBack = successCallBack
        this.failureDSCallBack = failureCallBack
    }

    fetchEnvelopes = () => {
        const endpoint = process.env.REACT_APP_AWS_ENDPOINT;
        this.api.getAPIWithTokenID(`${endpoint}/Live/EM_Envelopes_GET`)     
    }
   
    addEnvelope  = (requestData) => {
        this.api.postAPIWithTokenID(requestData,'/Live/EM_Envelope_ADD');        
    }

    updateEnvelopeName = (requestData) => {
        this.api.postAPIWithTokenID(requestData,'/Live/EM_Envelope_Name_UPDATE');        
    }

    cloneEnvelope  = (requestData) => {
        this.api.postAPIWithTokenID(requestData,'/Live/EM_Envelope_CLONE');        
    }
    
    datasetNamesGet = (requestData) => {
        this.api.postAPIWithTokenID(requestData,'/Live/EM_Wite_Datasets_GET');                
    }
    
    EnvelopeDSSuccess(responsedata)  {
        this.successDSCallBack(responsedata)
    }

    EnvelopeDSFailure(error) {
        this.failureDSCallBack(error)
    }

}

export default EnvelopeDS;