import React from 'react';
import Map from './Map';
import './App.css';

const ONE_MINUTE = 60 * 1000;
const FIFTEEN_MINUTES = 15 * ONE_MINUTE;
const ONE_HOUR = 60 * ONE_MINUTE;

class App extends React.Component {
  constructor (props) {
    super(props);

    this.state = {
      cyclones: [],
      myLocation: null,
      showSatellite: false,
      realTime: false,
      time: Date.now(),
    };
  }

  componentDidMount () {
    navigator.geolocation.getCurrentPosition(({ coords: myLocation }) => {
      this.setState({ myLocation });
    });

    this.timeout = setInterval(this.fetchData.bind(this), FIFTEEN_MINUTES);
    this.realtimer = setInterval(() => this.state.realTime && this.setState({ time: Date.now() }), ONE_MINUTE);
    this.fetchData();
  }

  componentWillUnmount () {
    clearInterval(this.timeout);
    clearInterval(this.realtimer);
    this.timeout = null;
  }

  async fetchData () {
    const r = await fetch("https://www.i-learner.edu.hk/weather/api/v2/cyclone");
    const cyclones = await r.json();

    // Avoid updating state after unmount
    if (this.timeout) {
      this.setState({ cyclones });
    }
  }

  render () {
    return (
      <div className="App">
        <Map
          cyclones={this.state.cyclones}
          myLocation={this.state.myLocation}
          showSatellite={this.state.showSatellite}
          time={this.state.realTime?this.state.time:0}
        />
        <ul className="App-key">
          {this.state.cyclones.map(c => <li key={c.id}>{c.name} {c.distance && `${c.distance} km`} {c.bearing}</li>)}
          <li><label><input type="checkbox" checked={this.state.showSatellite} onChange={e=>this.setState({ showSatellite: e.target.checked })} />Satellite</label></li>
          <li>
            <label><input type="checkbox" checked={!this.state.realTime} onChange={e=>this.setState({ realTime: !e.target.checked })} />Latest</label>
            {this.state.realTime && <div>
              <button onClick={()=>this.setState({ time: this.state.time - ONE_HOUR })}>Earlier</button>
              <button onClick={()=>this.setState({ time: this.state.time + ONE_HOUR })}>Later</button>
            </div>}
          </li>
        </ul>
      </div>
    );
  }
}

export default App;
