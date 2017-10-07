const { promisify } = require('util')

const Gpio = require('onoff').Gpio

const timeout = promisify(setTimeout)

const reset = new Gpio(24, 'out')

async function init () {
  await reset.writeSync(0)

  await timeout(100)

  await reset.writeSync(1)
}

init()
  .then(() => {
    process.on('SIGINT', reset.unexport)
    console.log('done')
  })
  .catch(console.error)

/*
DC = 23
RST = 24
SPI_PORT = 0
SPI_DEVICE = 0

LCDWIDTH = 84
LCDHEIGHT = 48
ROWPIXELS = LCDHEIGHT//6
PCD8544_POWERDOWN = 0x04
PCD8544_ENTRYMODE = 0x02
PCD8544_EXTENDEDINSTRUCTION = 0x01
PCD8544_DISPLAYBLANK = 0x0
PCD8544_DISPLAYNORMAL = 0x4
PCD8544_DISPLAYALLON = 0x1
PCD8544_DISPLAYINVERTED = 0x5
PCD8544_FUNCTIONSET = 0x20
PCD8544_DISPLAYCONTROL = 0x08
PCD8544_SETYADDR = 0x40
PCD8544_SETXADDR = 0x80
PCD8544_SETTEMP = 0x04
PCD8544_SETBIAS = 0x10
PCD8544_SETVOP = 0x80
*/
