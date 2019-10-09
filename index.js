const ArgumentType = Scratch.ArgumentType;
const BlockType = Scratch.BlockType;
const formatMessage = Scratch.formatMessage;
const log = Scratch.log;

eel = {
    _host: "http://127.0.0.1:8123",
	
    set_host: function (hostname) {
        eel._host = hostname
    },

    expose: function(f, name) {
        if(name === undefined){
            name = f.toString();
            let i = 'function '.length, j = name.indexOf('(');
            name = name.substring(i, j).trim();
        }

        eel._exposed_functions[name] = f;
    },

    guid: function() {
        return eel._guid;
    },

    // These get dynamically added by library when file is served
    _py_functions: ['get_idn'],

    _guid: ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
            (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        ),

    _exposed_functions: {},

    _mock_queue: [],

    _mock_py_functions: function() {
        for(let i = 0; i < eel._py_functions.length; i++) {
            let name = eel._py_functions[i];
            eel[name] = function() {
                let call_object = eel._call_object(name, arguments);
                eel._mock_queue.push(call_object);
                return eel._call_return(call_object);
            }
        }
    },
	
    _import_py_function: function(name) {
        let func_name = name;
		
        eel[name] = function() {
            let call_object = eel._call_object(func_name, arguments);
            eel._websocket.send(eel._toJSON(call_object));
            return eel._call_return(call_object);
        }
    },

    _call_number: 0,

    _call_return_callbacks: {},

    _call_object: function(name, args) {
        let arg_array = [];
        for(let i = 0; i < args.length; i++){
            arg_array.push(args[i]);
        }

        let call_id = (eel._call_number += 1) + Math.random();
        return {'call': call_id, 'name': name, 'args': arg_array};
    },

    _sleep: function(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    _toJSON: function(obj) {
        return JSON.stringify(obj, (k, v) => v === undefined ? null : v);
    },

    _call_return: function(call) {
        return function(callback = null) {
            if(callback != null) {
                eel._call_return_callbacks[call.call] = callback;
            } else {
                return new Promise(function(resolve) {
                    eel._call_return_callbacks[call.call] = resolve;
                });
            }
        }
    },

    _do_init: function() {


            let websocket_addr = (eel._host + '/eel').replace('http', 'ws');
            websocket_addr += ('?page=0');
            eel._websocket = new WebSocket(websocket_addr);

            eel._websocket.onopen = function() {
                for(let i = 0; i < eel._py_functions.length; i++){
                    let py_function = eel._py_functions[i];
                    eel._import_py_function(py_function);
                }

                while(eel._mock_queue.length > 0) {
                    let call = eel._mock_queue.shift();
                    eel._websocket.send(eel._toJSON(call));
                }
            };

            eel._websocket.onmessage = function (e) {
                let message = JSON.parse(e.data);
                if(message.hasOwnProperty('call') ) {
                    // Python making a function call into us
                    if(message.name in eel._exposed_functions) {
                        let return_val = eel._exposed_functions[message.name](...message.args);
                        eel._websocket.send(eel._toJSON({'return': message.call, 'value': return_val}));
                    }
                } else if(message.hasOwnProperty('return')) {
                    // Python returning a value to us
                    if(message['return'] in eel._call_return_callbacks) {
                        eel._call_return_callbacks[message['return']](message.value);
                    }
                } else {
                    throw 'Invalid message ' + message;
                }

            };
    },

    _init: function() {
        eel._mock_py_functions();
        eel._do_init();
    }
}

eel._init();

const menuIconURI = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAlgAAAF0CAYAAAD/4EcMAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsIAAA7CARUoSoAAAAAZdEVYdFNvZnR3YXJlAHBhaW50Lm5ldCA0LjAuMTnU1rJkAAAT9UlEQVR4Xu3dMVbbytvA4eFbi52CkxWIFZg0VLdNZ0po6FKmS2NK6NKmoom9AlhBTorYe/E3AvMPJBpbtl9jQZ7nHJ0LuQmMZSX6MRrLB/MsAQAQ5v8W/wUAIIjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGAH82zxMbCxWZpcfk83P3+mdHiSLj4MUq+3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ACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIldL/Ay3L/8sEfho1AAAAAElFTkSuQmCC";
const blockIconURI = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAlgAAAF0CAYAAAD/4EcMAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsIAAA7CARUoSoAAAAAZdEVYdFNvZnR3YXJlAHBhaW50Lm5ldCA0LjAuMTnU1rJkAAAT9UlEQVR4Xu3dMVbbytvA4eFbi52CkxWIFZg0VLdNZ0po6FKmS2NK6NKmoom9AlhBTorYe/E3AvMPJBpbtl9jQZ7nHJ0LuQmMZSX6MRrLB/MsAQAQ5v8W/wUAIIjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGAH82zxMbCxWZpcfk83P3+mdHiSLj4MUq+3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ACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIldL/Ay3L/8sEfho1AAAAAElFTkSuQmCC";

class HippoDevExtension{
  constructor (runtime){
    this.runtime = runtime;
    // communication related
    this.comm = runtime.ioDevices.comm;
    this.session = null;
    this.runtime.registerPeripheralExtension('HippoDev', this);
    // session callbacks
    this.reporter = null;
    this.onmessage = this.onmessage.bind(this);
    this.onclose = this.onclose.bind(this);
    this.write = this.write.bind(this);
    // string op
    this.decoder = new TextDecoder();
    this.lineBuffer = '';
  }

	// method required by vm runtime
    scan (){
        this.comm.getDeviceList().then(result => {
            this.runtime.emit(this.runtime.constructor.PERIPHERAL_LIST_UPDATE, result);
        });
    }

    connect (id){
        this.comm.connect(id).then(sess => {
            this.session = sess;
            this.session.onmessage = this.onmessage;
            this.session.onclose = this.onclose;
            // notify gui connected
            this.runtime.emit(this.runtime.constructor.PERIPHERAL_CONNECTED);
        }).catch(err => {
            log.warn('connect peripheral fail', err);
        });
    }

    disconnect (){
        this.session.close();
    }

    isConnected (){
        return Boolean(this.session);
    }
	
	onmessage (data){
		const dataStr = new TextDecoder().decode(data);
		this.lineBuffer += dataStr;
		if (this.lineBuffer.indexOf('\n') !== -1){
			const lines = this.lineBuffer.split('\n');
			this.lineBuffer = lines.pop();
			for (const l of lines){
				if (this.reporter) this.reporter(l);
			}
		}
	}

	onclose (error){
		log.warn('on close', error);
		this.session = null;
		this.runtime.emit(this.runtime.constructor.PERIPHERAL_ERROR);
	}
	
	write (data){
		if (!data.endsWith('\n')) data += '\n';
		if (this.session) this.session.write(data);
	}

	report (data){
		return new Promise(resolve => {
			this.write(data);
			this.reporter = resolve;
		});
	}

	getInfo (){
		return {
			id: 'HippoDev',
			name: 'HippoDev',
			color1: '#0FBD8C',
			color2: '#0DA57A',
			menuIconURI: menuIconURI,
			blockIconURI: blockIconURI,
			showStatusButton: true,

			blocks: [
				{
				  opcode: 'get_idn',
				  blockType: BlockType.REPORTER,
				  
				  text: formatMessage({
								id: 'HippoDevExtension.get_idn',
								default: '获取idn FROM [ADDR]'
							}),
				  arguments: {
					ADDR: {
					  type: ArgumentType.STRING,
					  defaultValue: 'USB0::0x049F::0x505E::22ea9d2603fd545::0::INSTR'
					}
				  },
				  func: 'get_idn'
				}
			]
		}
	}

	get_idn(args){
		const ADDR = args.ADDR;
		
		return new Promise(resolve => {
			//get idn send msgs to server and just return a function, then the function takes a function param as callback when server returns
			eel.get_idn(ADDR)(ret=>resolve(ret))
		});
	}
}

module.exports = HippoDevExtension
