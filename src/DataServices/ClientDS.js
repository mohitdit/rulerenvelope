
import Api from '../ApiUtility/Api'

class ClientDS {

    constructor(successCallBack, failureCallBack){
        console.log("constructor called...")
        this.api = new Api(this.ClientDSSuccess.bind(this), this.ClientDSFailure.bind(this))
        this.successDSCallBack = successCallBack
        this.failureDSCallBack = failureCallBack
    }

    fetchClients = () => {
        // this.api.mongoDBGetAPI(`/app/application-0-xygpnof/endpoint/EM_ClientsGET`)       
        const endpoint = process.env.REACT_APP_AWS_ENDPOINT;
        this.api.getAPIWithTokenID(`${endpoint}/Live/EM_ClientsGET`) 
    }
   
    addClient  = (requestData) => {
        // this.api.mongoDBPostAPI(requestData,'/app/application-0-xygpnof/endpoint/EM_Client_ADD');        
        this.api.postAPIWithTokenID(requestData,'/Live/EM_Client_ADD');        
    }

    deleteClient  = (requestData) => {
        // this.api.mongoDBPostAPI(requestData,'/app/application-0-xygpnof/endpoint/EM_Client_DELETE');                
        this.api.postAPIWithTokenID(requestData,'/Live/EM_Client_DELETE');                
    }
    editClient = (requestData) => {
        // this.api.mongoDBPostAPI(requestData,'/app/application-0-xygpnof/endpoint/EM_ClientStatus_UPDATE');                
        this.api.postAPIWithTokenID(requestData,'/Live/EM_ClientStatus_UPDATE');                
    }
    updateClient =(requestData) =>{
        // this.api.mongoDBPostAPI(requestData,'/app/application-0-xygpnof/endpoint/EM_Client_ByID_UPDATE')
        this.api.postAPIWithTokenID(requestData,'/Live/EM_Client_ByID_UPDATE')
    }

    ClientDSSuccess(responsedata)  {
        this.successDSCallBack(responsedata)
    }

    ClientDSFailure(error) {
        this.failureDSCallBack(error)
    }

}

export default ClientDS;
