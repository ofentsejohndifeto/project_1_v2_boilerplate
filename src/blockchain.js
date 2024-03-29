/**
 *                          Blockchain Class
 *  The Blockchain class contain the basics functions to create your own private blockchain
 *  It uses libraries like `crypto-js` to create the hashes for each block and `bitcoinjs-message` 
 *  to verify a message signature. The chain is stored in the array
 *  `this.chain = [];`. Of course each time you run the application the chain will be empty because and array
 *  isn't a persisten storage method.
 *  
 */

const SHA256 = require('crypto-js/sha256');
const BlockClass = require('./block.js');
const bitcoinMessage = require('bitcoinjs-message');

class Blockchain {

    /**
     * Constructor of the class, you will need to setup your chain array and the height
     * of your chain (the length of your chain array).
     * Also everytime you create a Blockchain class you will need to initialized the chain creating
     * the Genesis Block.
     * The methods in this class will always return a Promise to allow client applications or
     * other backends to call asynchronous functions.
     */
    constructor() {
        this.chain = [];
        this.height = -1;
        this.initializeChain();
    }

    /**
     * This method will check for the height of the chain and if there isn't a Genesis Block it will create it.
     * You should use the `addBlock(block)` to create the Genesis Block
     * Passing as a data `{data: 'Genesis Block'}`
     */
    async initializeChain() {
        if( this.height === -1){
            let block = new BlockClass.Block({data: 'Genesis Block'});
            await this._addBlock(block);
        }
    }

    /**
     * Utility method that return a Promise that will resolve with the height of the chain
     */
    getChainHeight() {
        return new Promise((resolve, reject) => {
            resolve(this.height);
        });
    }

    /**
     * _addBlock(block) will store a block in the chain
     * @param {*} block 
     * The method will return a Promise that will resolve with the block added
     * or reject if an error happen during the execution.
     * You will need to check for the height to assign the `previousBlockHash`,
     * assign the `timestamp` and the correct `height`...At the end you need to 
     * create the `block hash` and push the block into the chain array. Don't for get 
     * to update the `this.height`
     * Note: the symbol `_` in the method name indicates in the javascript convention 
     * that this method is a private method. 
     */
    _addBlock(block) {
        let self = this;
        return new Promise(async (resolve, reject) => {
            try {
                // Check if the chain is empty (Genesis block only) if not empty
                if (self.chain.length === 0) {
                    block.height = 0;
                    block.time = new Date().getTime().toString().slice(0, -3);
                    block.hash = SHA256(JSON.stringify(block)).toString();
                    self.chain.push(block);
                    self.height = 0;
                    resolve(block);
                } else {
                    // Get the previous block in chain
                    const previousBlock = self.chain[self.chain.length - 1];
                    // Set the height and previousBlockHash of the new block
                    block.height = previousBlock.height + 1;
                    block.previousBlockHash = previousBlock.hash;
                    block.time = new Date().getTime().toString().slice(0, -3);
                    // Calculate the hash of the new block
                    block.hash = SHA256(JSON.stringify(block)).toString();
                    // Add the block to the chain
                    self.chain.push(block);
                    self.height = block.height;
    
                    // Validate the chain after adding the new block? validate chain returns errors so we execute the method
                    const validationErrors = await self.validateChain();
                    if (validationErrors.length === 0) {
                        resolve(block);
                        console.log("Chain is validated")
                    } else {
                        reject(new Error("Chain validation failed."));
                    }
                }
            } catch (error) {
                reject(error);
            }
        });
    }
        

    /**
     * The requestMessageOwnershipVerification(address) method
     * will allow you  to request a message that you will use to
     * sign it with your Bitcoin Wallet (Electrum or Bitcoin Core)
     * This is the first step before submit your Block.
     * The method return a Promise that will resolve with the message to be signed
     * @param {*} address 
     */
    requestMessageOwnershipVerification(address) {
        return new Promise((resolve) => {
                const message = `${address}:${new Date().getTime().toString().slice(0, -3)}:starRegistry`;
                resolve(message);
        });
    }

    /**
     * The submitStar(address, message, signature, star) method
     * will allow users to register a new Block with the star object
     * into the chain. This method will resolve with the Block added or
     * reject with an error.
     * Algorithm steps:
     * 1. Get the time from the message sent as a parameter example: `parseInt(message.split(':')[1])`
     * 2. Get the current time: `let currentTime = parseInt(new Date().getTime().toString().slice(0, -3));`
     * 3. Check if the time elapsed is less than 5 minutes
     * 4. Veify the message with wallet address and signature: `bitcoinMessage.verify(message, address, signature)`
     * 5. Create the block and add it to the chain
     * 6. Resolve with the block added.
     * @param {*} address 
     * @param {*} message 
     * @param {*} signature 
     * @param {*} star 
     */
    submitStar(address, message, signature, star) {
        let self = this;
        return new Promise(async (resolve, reject) => {
            //each part of teh message is separated by ":" then we use Date to get teh current date and time which is teh 2nd variable
            const timeInMessage = parseInt(message.split(':')[1]);
            const currentTime = parseInt(new Date().getTime().toString().slice(0, -3));
            // I think because thsi is a promise it can calculate teh time continuously whilst waiting ot be called
            if (currentTime - timeInMessage > 300) {
                reject("5 miutes have passed");
                return;
            }
            //if signature and address are consistent returns true (simplified explanation)
            const isValid = bitcoinMessage.verify(message, address, signature);
            if (!isValid) {
                reject("Error detected with signature");
                return;
            }
            // since it is validated we get a new block created with all parameters into the chain
            const newBlock = new BlockClass.Block({ address, message, signature, star });
            await self._addBlock(newBlock);

            resolve(newBlock);
        });
    }

    /**
     * This method will return a Promise that will resolve with the Block
     *  with the hash passed as a parameter.
     * Search on the chain array for the block that has the hash.
     * @param {*} hash 
     */
    getBlockByHash(hash) {
        let self = this;
        return new Promise((resolve, reject) => {
            //we find block by hash using find() with arrow function pointing hash parameter
            const block = self.chain.find(block => block.hash === hash);
            
            if (block) {
                resolve(block);
            } else {
                resolve(null);
            }
        });
    }

    /**
     * This method will return a Promise that will resolve with the Block object 
     * with the height equal to the parameter `height`
     * @param {*} height 
     */
    getBlockByHeight(height) {
        let self = this;
        return new Promise((resolve, reject) => {
            //we find blocks simply by find() by height with arrow function
            const block = self.chain.find(block => block.height === height);
            if(block){
                resolve(block);
            } else {
                resolve(null);
            }
        });
    }

    /**
     * This method will return a Promise that will resolve with an array of Stars objects existing in the chain 
     * and are belongs to the owner with the wallet address passed as parameter.
     * Remember the star should be returned decoded.
     * @param {*} address 
     */
    getStarsByWalletAddress(address) {
        let self = this;
        let stars = [];
        return new Promise((resolve, reject) => {
            self.chain.forEach(async block => {
                //getBData() method in block.js returns body of block decoded
                const data = await block.getBData();
                //We check if data has been returned and whether address matches the Legacy address from Bitcoin
                if (data && data.address === address) {
                    stars.push(data);
                }
            });
            resolve(stars);
        });
    }
    

    /**
     * This method will return a Promise that will resolve with the list of errors when validating the chain.
     * Steps to validate:
     * 1. You should validate each block using `validateBlock`
     * 2. Each Block should check the with the previousBlockHash
     */
    validateChain() {
        let self = this;
        let errorLog = [];
        return new Promise(async (resolve, reject) => {
            //we go through each block with for loop
            for (let i = 0; i < self.chain.length; i++) {
                const block = self.chain[i];

                //validating blocks with method in Block.js
                const isValid = await block.validate();
                //push error to errorLog array
                if (isValid === false) {
                    errorLog.push(`Block ${block.height} is not valid.`);
                }
            }
            resolve(errorLog);
        });
    }

}

module.exports.Blockchain = Blockchain;   