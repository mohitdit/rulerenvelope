import { CognitoUserPool } from "amazon-cognito-identity-js";

const poolData ={
    UserPoolId:process.env.REACT_APP_COGNITO_USERPOOLID, 
    ClientId:process.env.REACT_APP_COGNITO_CLIENTID
}

export default new CognitoUserPool(poolData);