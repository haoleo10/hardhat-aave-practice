const { ethers, getNamedAccounts, network } = require("hardhat")
//const { networkConfig } = require("../helper-hardhat-config")
//deposit our token through for WETH token
//deposit a ETH ,return the WETH ,可以添加到钱包

const AMOUNT = ethers.utils.parseEther("0.1")

async function getWeth() {
    //为了与合约交互,我们需要account
    const { deployer } = await getNamedAccounts()
    //call the 'deposit' function on the weth contract?
    //与合约交互需要什么? abi ,conrtact address
    //getContractAt:从特定地址拿到合约0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2
    const iWeth = await ethers.getContractAt(
        "IWeth",
        "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",

        //networkConfig[network.config.chainId].wethToken,
        deployer
    )
    const txResponse = await iWeth.deposit({
        value: AMOUNT,
    })
    await txResponse.wait(1)
    const wethBalance = await iWeth.balanceOf(deployer)
    console.log(`Got ${wethBalance.toString()} WETH`)
}

module.exports = { getWeth, AMOUNT }
