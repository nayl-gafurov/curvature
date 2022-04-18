#![feature(map_try_insert)]
mod utils;
use std::collections::HashMap;
use triangle::{Point, Triangle};
use wasm_bindgen::prelude::*;

#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

pub fn prepare(coordinates: &Vec<f64>) -> HashMap<usize, usize> {
    let coords_len = coordinates.len() / 3;
    let mut map: HashMap<usize, usize> = HashMap::new();
    for (index, point) in coordinates.chunks(3).enumerate() {
        if !map.contains_key(&index) {
            for compare_point_index in index + 1..coords_len {
                if (point[0] - coordinates[compare_point_index * 3]).abs() < 0.00001
                    && (point[1] - coordinates[compare_point_index * 3 + 1]).abs() < 0.00001
                    && (point[2] - coordinates[compare_point_index * 3 + 2]).abs() < 0.00001
                {
                    map.insert(compare_point_index, index);
                }
            }
        }
    }
    map
}

#[wasm_bindgen]
pub fn get_curvature(coordinates: Vec<f64>, indices: Vec<usize>) -> Vec<f64> {
    let map = prepare(&coordinates);
    let coords_len = coordinates.len() / 3;
    let mut points = Vec::with_capacity(coords_len);
    let mut store: HashMap<usize, HashMap<usize, Vec<f64>>> = HashMap::new();
    let mut areas = vec![0.0; coords_len];

    for chunk in coordinates.chunks(3) {
        points.push(Point {
            x: chunk[0],
            y: chunk[1],
            z: chunk[2],
        });
    }
    for original_chunk in indices.chunks(3) {
        let mut chunk: [usize; 3] = [original_chunk[0], original_chunk[1], original_chunk[2]];
        let a = points[chunk[0]];
        let b = points[chunk[1]];
        let c = points[chunk[2]];
        let triangle = Triangle::new(a, b, c);
        let angels = triangle.angles().unwrap();

        for i in 0..3 {
            match map.get(&chunk[i]) {
                Some(val) => chunk[i] = *val,
                None => (),
            }
        }

        for (i, centeral_index) in chunk.iter().enumerate() {
            areas[*centeral_index] += triangle.area();
            let ring_indices_store: &mut HashMap<usize, Vec<f64>>;
            let ring_i = if i == 0 {
                [1, 2]
            } else if i == 1 {
                [0, 2]
            } else {
                [0, 1]
            };

            match store.get_mut(centeral_index) {
                Some(map) => ring_indices_store = map,
                None => {
                    ring_indices_store = store.try_insert(*centeral_index, HashMap::new()).unwrap();
                }
            };

            match ring_indices_store.get_mut(&chunk[ring_i[0]]) {
                Some(arr) => arr.push(angels[ring_i[1]]),
                None => {
                    ring_indices_store.insert(chunk[ring_i[0]], vec![angels[ring_i[1]]]);
                }
            }
            match ring_indices_store.get_mut(&chunk[ring_i[1]]) {
                Some(arr) => arr.push(angels[ring_i[0]]),
                None => {
                    ring_indices_store.insert(chunk[ring_i[1]], vec![angels[ring_i[0]]]);
                }
            }
        }
    }

    let mut curvatures = vec![0.0; coords_len];

    for core in store.iter() {
        let center = points[*core.0];
        let area = areas[*core.0];
        let mut curvature: Point = Point {
            x: 0.0,
            y: 0.0,
            z: 0.0,
        };
        for edge in core.1.iter() {
            if edge.1.len() == 2 {
                let front = points[*edge.0];
                let left_angel = edge.1[0];
                let right_angel = edge.1[1];
                let mut v = front - center;
                let k = 1.0 / left_angel.tan() + 1.0 / right_angel.tan();
                v.x *= k;
                v.y *= k;
                v.z *= k;
                curvature = curvature + v;
            }
        }
        curvatures[*core.0] =
            (curvature.x.powf(2.0) + curvature.y.powf(2.0) + curvature.z.powf(2.0)).sqrt()
                / (2.0 * area);
    }

    for (i, j) in map {
        curvatures[i] = curvatures[j]
    }
    curvatures
}
