# xyz.ping.stochastic.bootstrap

[![Build Status](https://travis-ci.org/node-xyz/xyz.ping.stochastic.bootstrap.svg?branch=master)](https://travis-ci.org/node-xyz/xyz.ping.stochastic.bootstrap) [![npm version](https://badge.fury.io/js/xyz.ping.stochastic.bootstrap.svg)](https://badge.fury.io/js/xyz.ping.stochastic.bootstrap)

---

Stochastic ping bootstrap function for xyz-core.

### Description

This module is an alternative for the [Default Ping]() bootstrap and is more suitable for deployment environment.

The main difference is that the default ping will iteratively send messages to all other nodes, while this module will increase its interval when no failure occurs. As an example, a node using this ping will start with a high rate of ping messages. As the time goes by, if no failure occurs, the ping rate will decrease. If a node fails to respond, the ping rate will automatically increase again.

As an example, the following will show the logs of an arbitrary node, `math.ms.js`. At first, this node is working alone. Next, a new node, `string.ms.js` will join and leave after a while. Let's see the behavior of `math.ms.js`.

Note that these logs will be available with `selfConf.logLevel: 'verbose'`.

First, `math.ms.js` will only ping itself and since everything is smooth, the ping rate will decrease
```
verbose :: STOCH PING :: ping cycle started. current interval: 2s
verbose :: STOCH PING :: ping cycle started. current interval: 3.92s
verbose :: STOCH PING :: ping cycle started. current interval: 5.763199999999999s
verbose :: STOCH PING :: ping cycle started. current interval: 7.532672s
verbose :: STOCH PING :: ping cycle started. current interval: 9.231365119999998s
verbose :: STOCH PING :: ping cycle started. current interval: 10.862110515199998s
verbose :: STOCH PING :: ping cycle started. current interval: 12.427626094591998s
verbose :: STOCH PING :: ping cycle started. current interval: 13.930521050808318s
verbose :: STOCH PING :: ping cycle started. current interval: 15.373300208775985s
verbose :: STOCH PING :: ping cycle started. current interval: 16.758368200424947s
verbose :: STOCH PING :: ping cycle started. current interval: 18.088033472407947s
verbose :: STOCH PING :: ping cycle started. current interval: 19.36451213351163s
verbose :: STOCH PING :: ping cycle started. current interval: 20.589931648171167s
verbose :: STOCH PING :: ping cycle started. current interval: 21.766334382244317s
verbose :: STOCH PING :: ping cycle started. current interval: 22.895681006954543s
verbose :: STOCH PING :: ping cycle started. current interval: 23.979853766676364s
```

When we join a new node to the system and kill it, we see the following:

```
verbose :: STOCH PING :: ping cycle started. current interval: 26.019833231368935s
error :: STOCH PING :: Error: 127.0.0.1:5000 has been out of reach for 1 pings :: ...
verbose :: STOCH PING :: ping cycle started. current interval: 14.489519951057089s
error :: STOCH PING :: Error: 127.0.0.1:5000 has been out of reach for 2 pings :: ...
verbose :: STOCH PING :: ping cycle started. current interval: 8.954969576507404s
error :: STOCH PING :: Error: 127.0.0.1:5000 has been out of reach for 3 pings :: ...
verbose :: STOCH PING :: ping cycle started. current interval: 6.298385396723553s
error :: STOCH PING :: Error: 127.0.0.1:5000 has been out of reach for 4 pings :: ...
verbose :: STOCH PING :: ping cycle started. current interval: 5.023224990427305s
error :: STOCH PING :: Error: 127.0.0.1:5000 has been out of reach for 5 pings :: ...
verbose :: STOCH PING :: ping cycle started. current interval: 4.4111479954051065s
error :: STOCH PING :: removing node {127.0.0.1:5000} from foreignNodes and nodes list
warn :: node 127.0.0.1:5000 removed from systemConf.
info ::  SR :: System Configuration changed new values: {"nodes":["127.0.0.1:4000"]}
verbose :: STOCH PING :: ping cycle started. current interval: 4.4s
verbose :: STOCH PING :: ping cycle started. current interval: 6.224s
verbose :: STOCH PING :: ping cycle started. current interval: 7.97504s
verbose :: STOCH PING :: ping cycle started. current interval: 9.6560384s
```

As you see, the ping rate drops from **26** to almost **4**, and when the node is removed and everything was stable again, it kept increasing again.

Please not that although this ping is more efficient than default ping, it is much slower in terms of discovering failures and propagation. Furthermore, it is still a **_Hearbeat based_** ping, meaning that each node will ping **every other node** in the system at a certain interval. This does not mean that this mechanism is not good, though you should be warned that it is still not efficient for very large systems.

### Usage

The module can be installed by

```
npm install xyz.ping.stochastic.bootstrap
```

In order to use this ping, the `defaultBootstrap` must be set to false

```
let XYZ = require('xyz-core')
let sPing = require('xyz.ping.stochastic.bootstrap')

var ms new XYZ({
  selfConf: {
    defaultBootstrap: false
  }
})
```

The bootstrap function accepts the following parameters:

```
ms.bootstrap(sPing, {
  event: true,              
  interval: 2 * 1000,       
  maxInterval: 50 * 1000,   
  minInterval: 1 * 1000,
  port: 4000
  routePrefix: 'S_PING'
})
```

where the the second parameter, options can have:

|    option   | default value   | description |
|:-----------:|-----------------|-------------|
| port        | `xyz.id().port` |      the port of the server to use       |
| event       | true            |      cli integration      |
| interval    | 5000            |      initial interval      |
| maxInterval | 25000           |      max interval      |
| minInterval | 2500            |      min interval      |
| routePrefix | PING            |      route to use in both client and server       |
| kick        | 5               |      threshold to kick nodes       |

> Note that if **routePrefix** is set to its default value, since it is the same as the route of **Default Ping**, this one node using this ping can cooperate with another node using **Default Ping**.

### Cli Integration

If you set `event: true`, a new message event will be bound to the process using this ping to fetch and monitor the rate of ping intervals. This event can be used by `xyz-cli`. As an example, if you clone this repo and run `xyz-cli` with `xyztestrc.json` in the root folder:

```
xyz dev -c ./xyztestrc.json
```

and use the `top` command:

![](https://github.com/node-xyz/xyz.ping.stochastic.bootstrap/blob/master/media/ex1.png?raw=true)

As you see, the ping intervals of each node is shown and will be updated lively.
