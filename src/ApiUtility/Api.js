import AWS from 'aws-sdk';
import Axios from 'axios';
import CryptoJS from 'crypto-js';

async function refreshIdToken() {
  const refreshToken = localStorage.getItem("refreshToken");
  const clientId = process.env.REACT_APP_COGNITO_CLIENTID;

  if (!refreshToken) {
    console.error("❌ No refresh token found.");
    return null;
  }

  const url = `https://cognito-idp.${process.env.REACT_APP_AWS_REGION}.amazonaws.com/`;

  const payload = {
    AuthFlow: "REFRESH_TOKEN_AUTH",
    ClientId: clientId,
    AuthParameters: {
      REFRESH_TOKEN: refreshToken,
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "X-Amz-Target": "AWSCognitoIdentityProviderService.InitiateAuth",
      "Content-Type": "application/x-amz-json-1.1",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (data.AuthenticationResult?.IdToken) {
    const newIdToken = data.AuthenticationResult.IdToken;
    localStorage.setItem("idToken", newIdToken);
    return newIdToken;
  }

  return null;
}

function handleSessionExpired() {
  localStorage.setItem("PP-PortalisLoggedIn", "false");

  const keep = ["rememberMe", "rememberedEmail", "rememberedPassword"];
  const saved = {};
  keep.forEach(k => {
    if (localStorage.getItem(k)) saved[k] = localStorage.getItem(k);
  });

  localStorage.clear();
  Object.entries(saved).forEach(([k, v]) =>
    localStorage.setItem(k, v)
  );

  localStorage.setItem(
    "SESSION_EXPIRED_MESSAGE",
    "Your session has expired. Please log in again."
  );

  window.location.replace("/");
}


class Api {

  constructor(successAPICallBack, failureAPICallBack) {
    this.successCallBack = successAPICallBack
    this.failureCallBack = failureAPICallBack
  }

  encryptData = (data, secretKey) => {
    return CryptoJS.AES.encrypt(JSON.stringify(data), secretKey).toString();
  };

  // Utility method for decryption
  decryptData = (encryptedData, secretKey) => {
    const decryptedBytes = CryptoJS.AES.decrypt(encryptedData, secretKey);
    const decryptedString = decryptedBytes.toString(CryptoJS.enc.Utf8);
    return JSON.parse(decryptedString);
  };

  getAPI = async (endPoint) => {

    try {

      const secretKey = process.env.REACT_APP_API_SECRTE_KEY; // Use environment variables for security

      AWS.config.update({
        region: process.env.REACT_APP_AWS_REGION, // Update with your AWS region
        accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY,
        secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY,
      });

      // Create an Axios instance with AWS Signature Version 4 interceptor
      const axiosWithAuth = Axios.create();
      axiosWithAuth.interceptors.request.use(async (config) => {
        const endpoint = endPoint
        const region = process.env.REACT_APP_AWS_REGION;

        // Create an AWS HttpRequest object
        const request = new AWS.HttpRequest(endpoint, region);
        request.method = 'GET';
        request.headers = {
          host: request.endpoint.host,
        };

        // Sign the request using AWS Signature Version 4
        const signer = new AWS.Signers.V4(request, 'execute-api');
        signer.addAuthorization(AWS.config.credentials, new Date());
        const headers = request.headers;
        delete headers.host;

        // Set AWS headers in the Axios request
        config.headers = {
          ...config.headers,
          ...headers,
        };

        return config;
      });

      // Fetch redaction data using Axios with AWS headers
      const response = await axiosWithAuth.get(endPoint);
      // console.log(response);
      if (response.status === 200) {
        const decryptedData = this.decryptData(response.data, secretKey);
        // console.log(decryptedData);
        this.successCallBack(decryptedData.data);
      } else {
        this.failureCallBack(response.data.message)
      }
    } catch (error) {
      this.failureCallBack(error.message)
    }

  }

  // POST API with encryption and AWS signature
  postAPI = (requestData, path) => {
    // console.log('Request data is : ', requestData)
    const secretKey = process.env.REACT_APP_API_SECRTE_KEY; // Use environment variables for security
    const encryptedData = this.encryptData(requestData, secretKey);
    // console.log("Encrypted Data:", encryptedData);

    const envelopeString = JSON.stringify(encryptedData);
    const sizeInBytes = new Blob([envelopeString]).size; // Size in bytes
    const sizeInMB = sizeInBytes / (1024 * 1024); // Convert to MB

    // console.log(`Encrypted Data Size: ${sizeInMB.toFixed(2)} MB`);

    try {
      const endpoint = process.env.REACT_APP_AWS_ENDPOINT;
      const region = process.env.REACT_APP_AWS_REGION;

      // Create AWS request
      const request = new AWS.HttpRequest(endpoint, region);
      request.method = 'POST';
      request.path = path;
      request.headers = { host: request.endpoint.host };
      request.body = encryptedData;

      // request.body = JSON.stringify({ data: encryptedData });

      // Setup AWS credentials
      const credentials = new AWS.Credentials({
        accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY,
        secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY,
      });

      // Sign the request with AWS Signature Version 4
      const signer = new AWS.Signers.V4(request, 'execute-api');
      signer.addAuthorization(credentials, new Date());

      const headers = request.headers;
      delete headers.host;

      // Make the POST request with encrypted data
      Axios({
        url: endpoint + request.path,
        headers: { ...headers },
        data: encryptedData, // Sending encrypted data
        method: 'POST',
      })
        .then((response) => {
          // console.log("Response :  " , response);
          if (response.status === 200) {
            const decryptedData = this.decryptData(response.data, secretKey);
            // console.log('Final Decrypted Data is :', decryptedData)
            this.successCallBack(decryptedData);
          }
          else if (response.status === 202) {
            const decryptedData = this.decryptData(response.data, secretKey);
            // console.log('Final Decrypted Data is :', decryptedData)
            this.successCallBack(decryptedData);
          }
          else {
            console.error('Invalid response data format:', response.data.message);
            this.failureCallBack('Invalid response data format');
          }
        })
        .catch((error) => {
          // console.error('Error posting data:', error);
          this.failureCallBack(error.message);
        });
    } catch (error) {
      // console.error('Error in postAPI:', error);
      this.failureCallBack(error.message);
    }
  };

  // postAPIWithTokenID = (requestData, path) => {
  //   const secretKey = process.env.REACT_APP_API_SECRTE_KEY; // Use environment variables for security
  //   const encryptedData = this.encryptData(requestData, secretKey).toString();
  //   try {
  //     const endpoint = process.env.REACT_APP_AWS_ENDPOINT;
  //     let token_id = localStorage.getItem("idToken");
  //     Axios({
  //       url: endpoint + path,
  //       method: 'POST',
  //       data: encryptedData, // plain encrypted string
  //       headers: {
  //         'Authorization': `Bearer ${token_id}`,
  //         'Content-Type': 'text/plain', // 👈 CRITICAL (tells Lambda it's raw text)
  //       },
  //       transformRequest: [(data) => data], // 👈 prevents Axios from quoting or stringifying
  //     })
  //       .then((response) => {
  //         if (response.status === 200) {
  //           const decryptedData = this.decryptData(response.data, secretKey);
  //           this.successCallBack(decryptedData);
  //         }
  //         else if (response.status === 202) {
  //           const decryptedData = this.decryptData(response.data, secretKey);
  //           this.successCallBack(decryptedData);
  //         }
  //         else {
  //           console.error('Invalid response data format:', response.data.message);
  //           this.failureCallBack('Invalid response data format');
  //         }
  //       })
  //       .catch((error) => {
  //         this.failureCallBack(error.message);
  //       });
  //   } catch (error) {
  //     this.failureCallBack(error.message);
  //   }
  // };

  // getAPIWithTokenID = (path) => {
  //   try {
  //     const secretKey = process.env.REACT_APP_API_SECRTE_KEY;

  //     console.log(path);

  //     Axios({
  //       url: path, // ✅ full URL like in POST
  //       method: 'GET',
  //       headers: {
  //         'Authorization': `Bearer ${token_id}`,
  //         'Content-Type': 'text/plain', // must match POST
  //       },
  //     })
  //       .then((response) => {
  //         console.log("response : ", response);
  //         if (response.status === 200 || response.status === 202) {
  //           const encryptedResponse =
  //             typeof response.data === 'string'
  //               ? response.data
  //               : response.data.body || response.data;

  //           const decryptedData = this.decryptData(encryptedResponse, secretKey);
  //           this.successCallBack(decryptedData.data);
  //         } else {
  //           console.error('Invalid response data format:', response.data.message);
  //           this.failureCallBack('Invalid response data format');
  //         }
  //       })

  //       .catch((error) => {
  //         console.log("Success catch : "+error);
  //         this.failureCallBack(error.message);
  //       });
  //   } catch (error) {
  //     console.log("Failure catch : "+error);
  //     this.failureCallBack(error.message);
  //   }
  // };


  makeAxiosRequest = async ({
    url,
    method,
    data,
    headers,
    retry = true
  }) => {
    try {
      return await Axios({
        url,
        method,
        data,
        headers,
        transformRequest: [(d) => d], // 🔒 prevent Axios stringify
      });
    } catch (err) {
      const status = err?.response?.status;

      // Axios "Network Error" but actually 401 from API Gateway
      const isUnauthorized =
        status === 401 ||
        (err.message === "Network Error" && err.request);

      console.error("Axios error:", status || err.message);

      if (retry && isUnauthorized) {
        console.log("🔄 Refreshing ID token (Axios)...");

        const newToken = await refreshIdToken();

        if (!newToken) {
          console.log("❌ Token refresh failed");
          handleSessionExpired();
          return new Promise(() => { });
        }

        return this.makeAxiosRequest({
          url,
          method,
          data,
          headers: {
            ...headers,
            Authorization: `Bearer ${newToken}`,
          },
          retry: false,
        });
      }

      throw err;
    }

  };

  postAPIWithTokenID = async (requestData, path) => {
    const secretKey = process.env.REACT_APP_API_SECRTE_KEY;
    const endpoint = process.env.REACT_APP_AWS_ENDPOINT + path;

    const encryptedData = this.encryptData(requestData, secretKey).toString();
    const token = localStorage.getItem("idToken");

    try {
      const response = await this.makeAxiosRequest({
        url: endpoint,
        method: "POST",
        data: encryptedData,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "text/plain",
        },
      });

      console.log(response);

      if (response.status === 200 || response.status === 202) {
        const decrypted = this.decryptData(response.data, secretKey);
        this.successCallBack(decrypted);
      } else {
        this.failureCallBack("Invalid response format");
      }
    } catch (error) {
      this.failureCallBack(error.message);
    }
  };

  getAPIWithTokenID = async (path) => {
    const secretKey = process.env.REACT_APP_API_SECRTE_KEY;
    const token = localStorage.getItem("idToken");

    try {
      const response = await this.makeAxiosRequest({
        url: path, // full URL
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "text/plain",
        },
      });

      if (response.status === 200 || response.status === 202) {
        const encrypted =
          typeof response.data === "string"
            ? response.data
            : response.data.body || response.data;

        const decrypted = this.decryptData(encrypted, secretKey);
        this.successCallBack(decrypted.data ?? decrypted);
      } else {
        this.failureCallBack("Invalid response format");
      }
    } catch (error) {
      this.failureCallBack(error.message);
    }
  };




}



export default Api;