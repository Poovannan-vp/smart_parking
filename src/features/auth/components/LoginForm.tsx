import { useState } from "react";

import Button from "../../../shared/components/Button";
import Card from "../../../shared/components/Card";
import Input from "../../../shared/components/Input";

export default function LoginForm() {
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    console.log({
      employeeId,
      password,
    });
  }

  return (
    <Card className="w-full max-w-sm">
      <form
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        <div>
          <h1 className="text-2xl font-bold text-center">
            Smart Parking
          </h1>

          <p className="mt-2 text-center text-slate-500">
            Employee Login
          </p>
        </div>

        <Input
          id="employeeId"
          label="Employee ID"
          placeholder="EMP001"
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
        />

        <Input
          id="password"
          type="password"
          label="Password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <Button
          fullWidth
          type="submit"
        >
          Login
        </Button>
      </form>
    </Card>
  );
}