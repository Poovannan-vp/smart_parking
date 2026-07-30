import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../config/firestore";

const buildings = [
  {
    id: "chennai-kg",
    data: {
      name: "Chennai KG",
      city: "Chennai",
      status: "Open",
      updatedAt: serverTimestamp(),

      parking: {
        closedBike: {
          capacity: 580,
          occupied: 0,
        },

        closedCar: {
          capacity: 47,
          occupied: 0,
        },

        openCar: {
          capacity: 67,
          occupied: 0,
        },
      },
    },
  },

  {
    id: "chennai-sr",
    data: {
      name: "Chennai SR",
      city: "Chennai",
      status: "Open",
      updatedAt: serverTimestamp(),

      parking: {
        closedBike: {
          capacity: 80,
          occupied: 0,
        },

        closedCar: {
          capacity: 28,
          occupied: 0,
        },

        openCar: {
          capacity: 20,
          occupied: 0,
        },
      },
    },
  },

  {
    id: "bangalore",
    data: {
      name: "Bangalore",
      city: "Bangalore",
      status: "Open",
      updatedAt: serverTimestamp(),

      parking: {
        general: {
          capacity: 84,
          occupied: 0,
        },
      },
    },
  },

  {
    id: "hyderabad",
    data: {
      name: "Hyderabad",
      city: "Hyderabad",
      status: "Open",
      updatedAt: serverTimestamp(),

      parking: {
        general: {
          capacity: 41,
          occupied: 0,
        },
      },
    },
  },
];

async function seedFirestore() {
  console.log("🌱 Seeding Firestore...\n");

  for (const building of buildings) {
    await setDoc(
      doc(db, "buildings", building.id),
      building.data
    );

    console.log(`✅ ${building.id} created`);
  }

  console.log("\n🎉 Firestore seeded successfully.");
}

seedFirestore().catch((error) => {
  console.error(error);
});