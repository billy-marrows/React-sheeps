import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const FIELD_SIZE = 600;
const AGENT_RADIUS = 10;
const DEFAULT_WOLF_COUNT = 3;
const DEFAULT_SHEEP_COUNT = 1;
const DEFAULT_GRASS_RATE = 0.005;
const DEFAULT_WOLF_SPEED = 0.6;
const DEFAULT_SHEEP_SPEED = 0.5;
const DEFAULT_DOG_SPEED = 0.7;
const DOG_HOME_POSITION = { x: FIELD_SIZE / 2, y: FIELD_SIZE / 2 };
const DOG_RETURN_TIME = 5000;
const DEFAULT_WOLF_VIEW_RADIUS = 100;
const DEFAULT_SHEEP_VIEW_RADIUS = 70;

const distance = (a, b) => {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

class Agent {
  constructor(x, y, speed, color) {
    this.id = Math.random().toString(36);
    this.x = x;
    this.y = y;
    this.speed = speed;
    this.color = color;
    this.vX = (Math.random() - 0.5) * 2;
    this.vY = (Math.random() - 0.5) * 2;
  }

  move() {
    this.x += this.vX * this.speed;
    this.y += this.vY * this.speed;
    if (this.x < 0 || this.x > FIELD_SIZE) {
      this.vX *= -1;
      this.x = Math.max(0, Math.min(FIELD_SIZE, this.x));
    }
    if (this.y < 0 || this.y > FIELD_SIZE) {
      this.vY *= -1;
      this.y = Math.max(0, Math.min(FIELD_SIZE, this.y));
    }
  }
}

class Wolf extends Agent {
  constructor(x, y, speed = 0.6) {
    super(x, y, speed, 'red');
  }
  hunt(sheepList, dogList, viewRadius = wolfViewRadius) {
    const closestDog = dogList.reduce((closest, dog) => {
      const distToMe = distance(this, dog);
      return !closest || distToMe < distance(closest, dog) ? dog : closest;
    }, null);

    const dogNearby = closestDog && distance(this, closestDog) < viewRadius;
    if (dogNearby) {
      const dx = this.x - closestDog.x;
      const dy = this.y - closestDog.y;
      const mag = Math.hypot(dx, dy);
      this.vX = (dx / mag) * this.speed;
      this.vY = (dy / mag) * this.speed;
      return;
    }
    const closestSheep = sheepList.reduce((closest, sheep) => {
      const distToMe = distance(this, sheep);
      return !closest && distToMe < viewRadius
        ? sheep
        : closest && distToMe < viewRadius && distToMe < distance(this, closest)
          ? sheep
          : closest;
    }, null);

    if (closestSheep) {
      const dx = closestSheep.x - this.x;
      const dy = closestSheep.y - this.y;
      const mag = Math.hypot(dx, dy);
      this.vX = (dx / mag) * this.speed;
      this.vY = (dy / mag) * this.speed;
    }
  }
}

class Sheep extends Agent {
  constructor(x, y, speed = 0.5) {
    super(x, y, speed, 'white');
  }
  eat(grassList, wolves, viewRadius) {
    const closestGrass = grassList.reduce((closest, grass) => {
      if (distance(this, grass) < viewRadius) {
        return grass;
      }
      else return closest;
    }, null);

    const isWolfNearby = wolves.some(wolf => distance(this, wolf) < viewRadius);
    if (isWolfNearby) {
      let avgX = 0;
      let avgY = 0;
      const nearbyWolves = wolves.filter(wolf => distance(this, wolf) < viewRadius);
      nearbyWolves.forEach(wolf => {
        avgX += wolf.x;
        avgY += wolf.y;
      });
      avgX /= nearbyWolves.length;
      avgY /= nearbyWolves.length;
      const dx = this.x - avgX;
      const dy = this.y - avgY;
      const mag = Math.hypot(dx, dy);
      this.vX = (dx / mag) * this.speed;
      this.vY = (dy / mag) * this.speed;
    } else if (closestGrass) {
      const dx = closestGrass.x - this.x;
      const dy = closestGrass.y - this.y;
      const mag = Math.hypot(dx, dy);
      this.vX = (dx / mag) * this.speed;
      this.vY = (dy / mag) * this.speed;
    }
    this.move();
  }
}
class GuardDog extends Agent {
  constructor(x, y, speed = 0.6) {
    super(x, y, speed, 'brown');
    this.returnTimer = null;
    this.isReturningHome = false;
  }

  patrol(wolfList) {
    const closestWolf = wolfList.reduce((closest, wolf) => {
      const distToMe = distance(this, wolf);
      return !closest || distToMe < distance(closest, wolf) ? wolf : closest;
    }, null);

    if (closestWolf && !this.isReturningHome) {
      const dx = closestWolf.x - this.x;
      const dy = closestWolf.y - this.y;
      const mag = Math.hypot(dx, dy);
      this.vX = (dx / mag) * this.speed;
      this.vY = (dy / mag) * this.speed;
    } else {
      if (!this.isReturningHome) {
        this.returnHome();
      }
    }
  }

  returnHome() {
    this.isReturningHome = true;
    const dx = DOG_HOME_POSITION.x - this.x;
    const dy = DOG_HOME_POSITION.y - this.y;
    const mag = Math.hypot(dx, dy);
    this.vX = (dx / mag) * this.speed;
    this.vY = (dy / mag) * this.speed;
    if (distance(this, DOG_HOME_POSITION) < AGENT_RADIUS) this.isReturningHome = false;
  }
}

class Grass {
  constructor(x, y) {
    this.id = Math.random().toString(36);
    this.x = x;
    this.y = y;
    this.color = 'green';
  }
}
// === Компонент App ===
function App() {
  const [wolfCount, setWolfCount] = useState(DEFAULT_WOLF_COUNT);
  const [sheepCount, setSheepCount] = useState(DEFAULT_SHEEP_COUNT);
  const [grassRate, setGrassRate] = useState(DEFAULT_GRASS_RATE);
  const [wolfSpeed, setWolfSpeed] = useState(DEFAULT_WOLF_SPEED);
  const [sheepSpeed, setSheepSpeed] = useState(DEFAULT_SHEEP_SPEED);
  const [dogSpeed, setDogSpeed] = useState(DEFAULT_DOG_SPEED);
  const [wolfViewRadius, setWolfViewRadius] = useState(DEFAULT_WOLF_VIEW_RADIUS);
  const [sheepViewRadius, setSheepViewRadius] = useState(DEFAULT_SHEEP_VIEW_RADIUS);
  const [wolves, setWolves] = useState([]);
  const [sheep, setSheep] = useState([]);
  const [dogs, setDogs] = useState([]);
  const [grasses, setGrasses] = useState([]);

  let lastDogHomeTouchTime = performance.now();
  const wolvesRef = useRef(wolves);
  const sheepRef = useRef(sheep);
  const grassesRef = useRef(grasses);
  const lastDogHomeTouchTimeRef = useRef(lastDogHomeTouchTime);

  useEffect(() => {
    grassesRef.current = grasses;
  }, [grasses]);
  useEffect(() => {
    wolvesRef.current = wolves;
  }, [wolves]);
  useEffect(() => {
    sheepRef.current = sheep;
  }, [sheep]);

  const [isRunning, setIsRunning] = useState(false);
  let animationFrameId = null;

  // === Инициализация с текущими параметрами ===
  const initializePopulation = () => {
    const newWolves = Array.from({ length: wolfCount }, () =>
      new Wolf(Math.random() * FIELD_SIZE, Math.random() * FIELD_SIZE)
    );

    const newSheep = Array.from({ length: sheepCount }, () =>
      new Sheep(Math.random() * FIELD_SIZE, Math.random() * FIELD_SIZE)
    );

    const newDogs = [new GuardDog(DOG_HOME_POSITION.x, DOG_HOME_POSITION.y)];

    setWolves(newWolves);
    setSheep(newSheep);
    setDogs(newDogs);
    setGrasses([]);
    lastDogHomeTouchTime = performance.now();
  };

  // === Обновление параметров при изменении ползунков ===
  useEffect(() => {
    initializePopulation();
  }, [wolfCount, sheepCount, grassRate, wolfSpeed, sheepSpeed, dogSpeed]);

  // === Симуляция ===
  const simulateStep = () => {
    // Получаем актуальные значения из useRef
    const currentWolves = wolvesRef.current;
    const currentSheep = sheepRef.current;
    const currentGrasses = grassesRef.current;

    // === Обновляем волков ===
    setWolves((prevWolves) =>
      prevWolves.map((wolf) => {
        wolf.speed = wolfSpeed;
        wolf.hunt(currentSheep, dogs, wolfViewRadius);
        wolf.move();
        return wolf;
      })
    );

    // === Обновляем овец ===
    setSheep((prevSheep) =>
      prevSheep
        .map((s) => {
          // Проверяем, съедена ли овца
          const eaten = currentWolves.some((wolf) => distance(wolf, s) < AGENT_RADIUS);
          if (!eaten) {
            s.speed = sheepSpeed;
            s.eat(currentGrasses, currentWolves, sheepViewRadius);
            s.move();
          }
          return eaten ? null : s;
        })
        .filter(Boolean)
    );

    // === Обновляем траву ===
    setGrasses((prevGrasses) => {
      let newGrasses = [...prevGrasses];

      newGrasses = newGrasses.filter((grass) =>
        !currentSheep.some((s) => distance(s, grass) < AGENT_RADIUS)
      );
      if (Math.random() < grassRate) {
        const newGrass = new Grass(Math.random() * FIELD_SIZE, Math.random() * FIELD_SIZE);
        newGrasses.push(newGrass);
      }

      return newGrasses;
    });
    // === Обновляем собаку ===
    setDogs((prevDogs) =>
      prevDogs.map((dog) => {
        dog.speed = dogSpeed;
        dog.patrol(currentWolves);
        if (distance(dog, DOG_HOME_POSITION) < AGENT_RADIUS) {
          lastDogHomeTouchTime = performance.now();
          dog.isReturningHome = false;
        }
        // Если прошло 5 секунд после ухода из дома — возвращаемся
        if (performance.now() - lastDogHomeTouchTime >= 5000) {
          dog.returnHome();
        }
        dog.move();
        return dog;
      })
    );

    // === Если симуляция запущена, запрашиваем следующий кадр ===
    if (isRunning) {
      animationFrameId = requestAnimationFrame(simulateStep);
    }
  };






  // === Запуск/остановка симуляции ===
  useEffect(() => {
    if (!isRunning) return;
    animationFrameId = requestAnimationFrame(simulateStep);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isRunning]);

  const toggleSimulation = () => {
    setIsRunning((prev) => !prev);
    lastDogHomeTouchTime = performance.now();
  };
  const resetSimulation = () => {
    setIsRunning(false);
    initializePopulation();
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1> Симуляция: Волки, овцы и сторожевая собака</h1>
        <p>Управляйте параметрами и наблюдайте за поведением животных</p>
      </header>

      <div className="main-layout">
        <aside className="controls-panel">
          <h2>🔧 Параметры симуляции</h2>
          <div className="control-group">
            <label>Количество волков: {wolfCount}</label>
            <input
              type="range"
              min="1"
              max="20"
              value={wolfCount}
              onChange={(e) => setWolfCount(Number(e.target.value))}
            />
          </div>
          <div className="control-group">
            <label>Количество овец: {sheepCount}</label>
            <input
              type="range"
              min="5"
              max="50"
              value={sheepCount}
              onChange={(e) => setSheepCount(Number(e.target.value))}
            />
          </div>
          <div className="control-group">
            <label>Частота появления травы: {(grassRate * 100).toFixed(2)}%</label>
            <input
              type="range"
              min="0"
              max="0.02"
              step="0.001"
              value={grassRate}
              onChange={(e) => setGrassRate(Number(e.target.value))}
            />
          </div>
          <div className="control-group">
            <label>Скорость волков: {wolfSpeed}</label>
            <input
              type="range"
              min="0.1"
              max="0.6"
              step="0.05"
              value={wolfSpeed}
              onChange={(e) => setWolfSpeed(Number(e.target.value))}
            />
          </div>
          <div className="control-group">
            <label>Скорость овец: {sheepSpeed}</label>
            <input
              type="range"
              min="0.1"
              max="0.6"
              step="0.05"
              value={sheepSpeed}
              onChange={(e) => setSheepSpeed(Number(e.target.value))}
            />
          </div>
          <div className="control-group">
            <label>Скорость собаки: {dogSpeed}</label>
            <input
              type="range"
              min="0.1"
              max="0.7"
              step="0.05"
              value={dogSpeed}
              onChange={(e) => setDogSpeed(Number(e.target.value))}
            />
          </div>
          <div className="control-group">
            <label>Радиус обзора волка: {wolfViewRadius}</label>
            <input
              type="range"
              min="20"
              max="200"
              value={wolfViewRadius}
              onChange={(e) => setWolfViewRadius(Number(e.target.value))}
            />
          </div>
          <div className="control-group">
            <label>Радиус убегания овцы: {sheepViewRadius}</label>
            <input
              type="range"
              min="20"
              max="200"
              value={sheepViewRadius}
              onChange={(e) => setSheepViewRadius(Number(e.target.value))}
            />
          </div>
          <div className="button-group">
            <button onClick={toggleSimulation}>
              {isRunning ? '⏸ Остановить' : '▶ Запустить'}
            </button>
            <button onClick={resetSimulation}>🔄 Перезапустить</button>
          </div>
        </aside>

        {/* Зона симуляции */}
        <main className="simulation-area">
          <div className="simulation-zone">
            <div
              className="dog-house"
              style={{
                left: `${DOG_HOME_POSITION.x}px`,
                top: `${DOG_HOME_POSITION.y}px`,
              }}
            />
            {wolves.map((wolf) => (
              <React.Fragment key={wolf.id}>
                <div
                  className="view-radius"
                  style={{
                    left: `${wolf.x - wolfViewRadius}px`,
                    top: `${wolf.y - wolfViewRadius}px`,
                    width: `${wolfViewRadius * 2}px`,
                    height: `${wolfViewRadius * 2}px`,
                    backgroundColor: 'rgba(255, 0, 0, 0.2)',
                  }}
                />
                <div
                  className="agent"
                  style={{
                    left: `${wolf.x}px`,
                    top: `${wolf.y}px`,
                    backgroundColor: wolf.color,
                    zIndex: 1,
                  }}
                />
              </React.Fragment>
            ))}
            {sheep.map((s) => (
              <React.Fragment key={s.id}>
                <div
                  className="view-radius"
                  style={{
                    left: `${s.x - sheepViewRadius}px`,
                    top: `${s.y - sheepViewRadius}px`,
                    width: `${sheepViewRadius * 2}px`,
                    height: `${sheepViewRadius * 2}px`,
                    backgroundColor: 'rgba(0, 150, 255, 0.2)',
                  }}
                />
                <div
                  className="agent"
                  style={{
                    left: `${s.x}px`,
                    top: `${s.y}px`,
                    backgroundColor: s.color,
                    zIndex: 1,
                  }}
                />
              </React.Fragment>
            ))}
            {dogs.map((dog) => (
              <div
                key={dog.id}
                className="agent"
                style={{
                  left: `${dog.x}px`,
                  top: `${dog.y}px`,
                  backgroundColor: dog.color,
                }}
              />
            ))}
            {grasses.map((grass) => (
              <div
                key={grass.id}
                className="grass"
                style={{
                  left: `${grass.x}px`,
                  top: `${grass.y}px`,
                  backgroundColor: grass.color,
                }}
              />
            ))}
          </div>
        </main>
      </div>
      <footer className="app-footer">
        <h2>ℹ Как работает симуляция</h2>
        <ul>
          <li> Волки охотятся на овец. Если рядом есть собака — убегают от неё.</li>
          <li> Овцы ищут траву и убегают от волков.</li>
          <li> Собака преследует волков и возвращается домой каждые 5 секунд.</li>
          <li> Трава появляется случайно и исчезает, если её съела овца.</li>
          <li> Используйте ползунки, чтобы изменить параметры симуляции.</li>
        </ul>
      </footer>
    </div>
  );
}

export default App;