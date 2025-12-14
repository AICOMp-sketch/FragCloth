
    (() => {
      const canvas = document.getElementById('clothCanvas');
      const ctx = canvas.getContext('2d');
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;

      const config = {
        cols: 42,
        rows: 24,
        spacing: 18,
        gravity: 0.55,
        damping: 0.995,
        iterations: 6
      };

      let points = [];
      let constraints = [];
      let isPaused = false;
      let windStrength = 40;

      const circleObstacle = { x: canvasWidth * 0.7, y: canvasHeight * 0.55, r: 80 };
      const rectObstacle = { x: canvasWidth * 0.2, y: canvasHeight * 0.72, w: 210, h: 55 };

      function Point(x, y) {
        this.x = x;
        this.y = y;
        this.oldx = x;
        this.oldy = y;
        this.pinned = false;
      }

      function Constraint(p1, p2, length) {
        this.p1 = p1;
        this.p2 = p2;
        this.length = length;
      }

      function setPinned(point, value) {
        point.pinned = value;
        if (value) {
          point.oldx = point.x;
          point.oldy = point.y;
        }
      }

      function createCloth() {
        points = [];
        constraints = [];
        const offsetX = (canvasWidth - (config.cols - 1) * config.spacing) / 2;
        const offsetY = 60;

        for (let y = 0; y < config.rows; y++) {
          for (let x = 0; x < config.cols; x++) {
            const px = offsetX + x * config.spacing;
            const py = offsetY + y * config.spacing;
            const point = new Point(px, py);

            if (y === 0 && (x % 2 === 0 || x === 0 || x === config.cols - 1)) {
              setPinned(point, true);
            }

            points.push(point);

            if (x > 0) {
              const leftNeighbor = points[points.length - 2];
              constraints.push(new Constraint(point, leftNeighbor, config.spacing));
            }

            if (y > 0) {
              const topNeighbor = points[(y - 1) * config.cols + x];
              constraints.push(new Constraint(point, topNeighbor, config.spacing));
            }
          }
        }
      }

      function keepInBounds(point) {
        if (point.pinned) return;
        if (point.x > canvasWidth) point.x = canvasWidth;
        if (point.x < 0) point.x = 0;
        if (point.y > canvasHeight) point.y = canvasHeight;
        if (point.y < 0) point.y = 0;
      }

      function resolveCircle(point, circle) {
        if (point.pinned) return;
        const dx = point.x - circle.x;
        const dy = point.y - circle.y;
        const dist = Math.hypot(dx, dy);
        if (dist < circle.r) {
          const overlap = circle.r - (dist || 0.0001);
          const nx = dx / (dist || 0.0001);
          const ny = dy / (dist || 0.0001);
          point.x += nx * overlap;
          point.y += ny * overlap;
        }
      }

      function resolveRectangle(point, rect) {
        if (point.pinned) return;
        if (
          point.x >= rect.x &&
          point.x <= rect.x + rect.w &&
          point.y >= rect.y &&
          point.y <= rect.y + rect.h
        ) {
          const left = point.x - rect.x;
          const right = rect.x + rect.w - point.x;
          const top = point.y - rect.y;
          const bottom = rect.y + rect.h - point.y;
          const min = Math.min(left, right, top, bottom);
          if (min === left) point.x = rect.x;
          else if (min === right) point.x = rect.x + rect.w;
          else if (min === top) point.y = rect.y;
          else point.y = rect.y + rect.h;
        }
      }

      function resolveCollisions(point) {
        resolveCircle(point, circleObstacle);
        resolveRectangle(point, rectObstacle);
      }

      function updatePoints() {
        const gustFactor = windStrength * 0.06;
        for (const point of points) {
          if (point.pinned) continue;
          const vx = (point.x - point.oldx) * config.damping;
          const vy = (point.y - point.oldy) * config.damping;
          point.oldx = point.x;
          point.oldy = point.y;
          const wind = (Math.random() - 0.5) * gustFactor;
          point.x += vx + wind;
          point.y += vy + config.gravity;
          keepInBounds(point);
          resolveCollisions(point);
        }
      }

      function satisfyConstraints() {
        for (let i = 0; i < config.iterations; i++) {
          for (const constraint of constraints) {
            const dx = constraint.p2.x - constraint.p1.x;
            const dy = constraint.p2.y - constraint.p1.y;
            const dist = Math.hypot(dx, dy) || 0.0001;
            const diff = (constraint.length - dist) / dist;
            const adjustX = dx * diff * 0.5;
            const adjustY = dy * diff * 0.5;

            if (!constraint.p1.pinned) {
              constraint.p1.x -= adjustX;
              constraint.p1.y -= adjustY;
              keepInBounds(constraint.p1);
            }

            if (!constraint.p2.pinned) {
              constraint.p2.x += adjustX;
              constraint.p2.y += adjustY;
              keepInBounds(constraint.p2);
            }
          }

          for (const point of points) {
            resolveCollisions(point);
          }
        }
      }

      function drawBackgroundObjects() {
        ctx.save();
        ctx.fillStyle = 'rgba(59, 130, 246, 0.25)';
        ctx.beginPath();
        ctx.arc(circleObstacle.x, circleObstacle.y, circleObstacle.r, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(236, 72, 153, 0.3)';
        ctx.fillRect(rectObstacle.x, rectObstacle.y, rectObstacle.w, rectObstacle.h);
        ctx.restore();
      }

      function drawCloth() {
        ctx.save();
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        drawBackgroundObjects();

        ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (const constraint of constraints) {
          ctx.moveTo(constraint.p1.x, constraint.p1.y);
          ctx.lineTo(constraint.p2.x, constraint.p2.y);
        }
        ctx.stroke();

        for (const point of points) {
          ctx.beginPath();
          ctx.fillStyle = point.pinned ? '#34d399' : '#f8fafc';
          ctx.arc(point.x, point.y, point.pinned ? 2.6 : 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      function animate() {
        if (!isPaused) {
          updatePoints();
          satisfyConstraints();
        }
        drawCloth();
        requestAnimationFrame(animate);
      }

      function pinCorners() {
        const topLeft = points[0];
        const topRight = points[config.cols - 1];
        const bottomLeft = points[points.length - config.cols];
        const bottomRight = points[points.length - 1];
        [topLeft, topRight, bottomLeft, bottomRight].forEach(point => setPinned(point, true));
      }

      function handleCanvasClick(event) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (event.clientX - rect.left) * scaleX;
        const y = (event.clientY - rect.top) * scaleY;

        let closest = null;
        let minDist = Infinity;

        for (const point of points) {
          const dx = point.x - x;
          const dy = point.y - y;
          const dist2 = dx * dx + dy * dy;
          if (dist2 < minDist) {
            minDist = dist2;
            closest = point;
          }
        }

        if (closest && Math.sqrt(minDist) <= config.spacing) {
          setPinned(closest, !closest.pinned);
        }
      }

      document.getElementById('windRange').addEventListener('input', event => {
        windStrength = Number(event.target.value);
        document.getElementById('windValue').textContent = windStrength.toFixed(0);
      });

      document.getElementById('pauseBtn').addEventListener('click', event => {
        isPaused = !isPaused;
        event.currentTarget.textContent = isPaused ? 'Resume' : 'Pause';
      });

      document.getElementById('resetBtn').addEventListener('click', () => {
        createCloth();
      });

      document.getElementById('pinCornersBtn').addEventListener('click', pinCorners);

      document.getElementById('unpinBtn').addEventListener('click', () => {
        points.forEach(point => setPinned(point, false));
      });

      canvas.addEventListener('click', handleCanvasClick);

      createCloth();
      animate();
    })();