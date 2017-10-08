// Based on:
// * https://github.com/adafruit/Adafruit_Nokia_LCD
// * https://github.com/pevandenburie/node-pcd8544-rpi

const { promisify } = require('util')

const SPI = require('pi-spi')
const { Gpio } = require('onoff')

const draw = require('./text')

const timeout = promisify(setTimeout)

const DC = 23
const RST = 24
const SPI_PORT = 0
const SPI_DEVICE = 0

const LCDWIDTH = 84
const LCDHEIGHT = 48
const ROWPIXELS = LCDHEIGHT// 6
const PCD8544_POWERDOWN = 0x04
const PCD8544_ENTRYMODE = 0x02
const PCD8544_EXTENDEDINSTRUCTION = 0x01
const PCD8544_DISPLAYBLANK = 0x0
const PCD8544_DISPLAYNORMAL = 0x4
const PCD8544_DISPLAYALLON = 0x1
const PCD8544_DISPLAYINVERTED = 0x5
const PCD8544_FUNCTIONSET = 0x20
const PCD8544_DISPLAYCONTROL = 0x08
const PCD8544_SETYADDR = 0x40
const PCD8544_SETXADDR = 0x80
const PCD8544_SETTEMP = 0x04
const PCD8544_SETBIAS = 0x10
const PCD8544_SETVOP = 0x80

let displaySPI = null

let resetGPIO = null
let dcGPIO = null

async function command (c) {
  // DC pin low signals command byte.
  dcGPIO.writeSync(0)
  await writeSPI([c])
}

async function extended_command (c) {
  // """Send a command in extended mode"""
  // # Set extended command mode
  await command(PCD8544_FUNCTIONSET | PCD8544_EXTENDEDINSTRUCTION)
  await command(c)
  // # Set normal display mode.
  await command(PCD8544_FUNCTIONSET)
  await command(PCD8544_DISPLAYCONTROL | PCD8544_DISPLAYNORMAL)
}

async function set_bias (bias) {
  await extended_command(PCD8544_SETBIAS | bias)
}

// """Set contrast to specified value (should be 0-127)."""
async function set_contrast (contrast) {
  contrast = Math.max(0, Math.min(contrast, 0x7f)) // Clamp to values 0-0x7f
  await extended_command(PCD8544_SETVOP | contrast)
}

async function display(content) {
  // """Write display buffer to physical display."""
  // # TODO: Consider support for partial updates like Arduino library.
  // # Reset to position zero.
  await command(PCD8544_SETYADDR)
  await command(PCD8544_SETXADDR)
  // # Write the buffer.
  dcGPIO.writeSync(1)
  await writeSPI(content)
}

async function writeSPI (c) {
  const sendBuffer = Buffer.from(c)
  const promisedTransfer = promisify(displaySPI.transfer)
  const result = await promisedTransfer(sendBuffer, sendBuffer.length)
  return result
}

async function init () {
  resetGPIO = new Gpio(RST, 'out')
  dcGPIO = new Gpio(DC, 'out')

  displaySPI = SPI.initialize('/dev/spidev0.0')

  await reset()
  await set_bias(4)
  await set_contrast(60)
  await display(draw(0, 0, 'Hi wanderer!'))
  await timeout(2000)
  const logo = [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xC0, 0xE0, 0xF0, 0xF8, 0xFC, 0xFC, 0xFE, 0xFF, 0xFC, 0xE0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xF8, 0xF8, 0xF8, 0xF8, 0xF8, 0xF8, 0xF8, 0xF8, 0xF8, 0xF8, 0xF8, 0xF8, 0xF0, 0xF0, 0xE0, 0xE0, 0xC0, 0x80, 0xC0, 0xFC, 0xFF, 0xFF, 0xFF, 0xFF, 0x7F, 0x3F, 0x7F, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0F, 0x1F, 0x3F, 0x7F, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xE7, 0xC7, 0xC7, 0x87, 0x8F, 0x9F, 0x9F, 0xFF, 0xFF, 0xFF, 0xC1, 0xC0, 0xE0, 0xFC, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFC, 0xFC, 0xFC, 0xFC, 0xFE, 0xFE, 0xFE, 0xFC, 0xFC, 0xF8, 0xF8, 0xF0, 0xE0, 0xC0, 0xC0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x80, 0xC0, 0xE0, 0xF1, 0xFB, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x7F, 0x1F, 0x0F, 0x0F, 0x87, 0xE7, 0xFF, 0xFF, 0xFF, 0x1F, 0x1F, 0x3F, 0xF9, 0xF8, 0xF8, 0xF8, 0xF8, 0xF8, 0xF8, 0xFD, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x7F, 0x3F, 0x0F, 0x07, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xF0, 0xFE, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFE, 0x7E, 0x3F, 0x3F, 0x0F, 0x1F, 0xFF, 0xFF, 0xFF, 0xFC, 0xF0, 0xE0, 0xF1, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFC, 0xF0, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0x03, 0x03, 0x03, 0x03, 0x03, 0x03, 0x03, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0x0F, 0x1F, 0x3F, 0x7F, 0x7F, 0xFF, 0xFF, 0xFF, 0xFF, 0x7F, 0x7F, 0x1F, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 ]
  await display(logo)
  await timeout(3000)
  await display(draw(0, 20, 'What u lookin at?????????????????'))
}

async function reset () {
  resetGPIO.writeSync(0)

  await timeout(100)

  resetGPIO.writeSync(1)
}

init()
  .then(() => {
    process.on('SIGINT', () => {
      resetGPIO.unexport()
      dcGPIO.unexport()
    })
    console.log('done')
  })
  .catch(console.error)
