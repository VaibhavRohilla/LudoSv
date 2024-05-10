    
// // with ES Module
// import { Client, ScpClient } from 'node-scp'


// let clientHandler: ScpClient | null = null;

// Client({
    // host: '64.227.142.49', //remote host ip 
//     port: 22, //port used for scp 
//     username: 'root', //username to authenticate
//     password: '', //password to authenticate
// }).then(client => {
//     clientHandler = client;
//     console.log("ready to upload files")

// }).catch(e => console.log(e))

// // client.uploadFile(
// //     '../logs/test.txt',
// //     '/workspace/test.txt',
// //     // options?: TransferOptions
// // )
// //     .then(response => {
// //         console.log("sent the file")
// //         client.close() // remember to close connection after you finish
// //     })
// //     .catch(error => { 
// //         console.log(error)
// //     })




// export async function uploadFile(filename: string, filepath: string) : Promise<boolean> {
//     console.log(filepath)

//     if(clientHandler != null) {
//         try {
//             let response = await clientHandler.uploadFile(filepath, `/root/workspace/public/${filename}.txt`);
//             console.log(response)
//             console.log("File uploaded successfully")
//             return true;
//         } catch (error) { 
//             console.log("Failed to upload file")
//             console.log(error)
//             return false;
//         }
//     }

//     console.log("clientHandler is null")
//     return false;


//     // if (clientHandler != null) {
//     //     clientHandler.uploadFile(filepath, `/root/workspace/public/${filename}.txt`).then(() => {
//     //         console.log('File uploaded successfully');
//     //     }).catch(e => {

//     //         console.log("Failed to upload file");
//     //         console.log(e)
//     //     });
//     // }    
// }