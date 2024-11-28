"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SimplexInput {
  maximize: boolean;
  objective: number[];
  lhs_ineq: number[][];
  rhs_ineq: number[];
  desired_variations: number[];
}

interface SimplexOutput {
  status: number;
  message: string;
  optimal_value: number;
  solution: number[];
  shadow_prices: number[];
  variation_viable: boolean[];
  new_optimal_values: number[];
}

const formatEquation = (
  coefficients: number[],
  isObjective: boolean = false
): string => {
  let equation = isObjective ? "Z = " : "";
  let hasTerms = false;

  coefficients.forEach((coef, index) => {
    if (coef === 0 || coef === null || isNaN(coef)) {
      return;
    }

    if (hasTerms && coef > 0) {
      equation += " + ";
    } else if (hasTerms && coef < 0) {
      equation += " - ";
    } else if (coef < 0) {
      equation += "-";
    }

    const absCoef = Math.abs(coef);
    if (absCoef !== 1 || isObjective) {
      equation += absCoef;
    }

    equation += `x${index + 1}`;
    hasTerms = true;
  });

  return equation || "0";
};

export default function LinearProgrammingSolver() {
  const [activeTab, setActiveTab] = useState("input");
  const [numVariables, setNumVariables] = useState<number>(2);
  const [maximize, setMaximize] = useState<boolean>(true);
  const [objective, setObjective] = useState<number[]>([0, 0]);
  const [constraints, setConstraints] = useState<
    { lhs: number[]; rhs: number; variation: number }[]
  >([{ lhs: [0, 0], rhs: 0, variation: 0 }]);
  const [result, setResult] = useState<SimplexOutput | null>(null);

  useEffect(() => {
    document.querySelector("body > nextjs-portal")?.remove();
  }, []);

  const handleObjectiveChange = (index: number, value: number) => {
    const newObjective = [...objective];
    newObjective[index] = value;
    setObjective(newObjective);
  };

  const handleConstraintChange = (
    constraintIndex: number,
    varIndex: number,
    value: number
  ) => {
    const newConstraints = [...constraints];
    newConstraints[constraintIndex].lhs[varIndex] = value;
    setConstraints(newConstraints);
  };

  const handleRhsChange = (index: number, value: number) => {
    const newConstraints = [...constraints];
    newConstraints[index].rhs = value;
    setConstraints(newConstraints);
  };

  const handleVariationChange = (index: number, value: number) => {
    const newConstraints = [...constraints];
    newConstraints[index].variation = value;
    setConstraints(newConstraints);
  };

  const addConstraint = () => {
    setConstraints([
      ...constraints,
      { lhs: new Array(numVariables).fill(0), rhs: 0, variation: 0 },
    ]);
  };

  const removeConstraint = (index: number) => {
    const newConstraints = constraints.filter((_, i) => i !== index);
    setConstraints(newConstraints);
  };

  const handleSubmit = async () => {
    const input: SimplexInput = {
      maximize,
      objective,
      lhs_ineq: constraints.map((c) => c.lhs),
      rhs_ineq: constraints.map((c) => c.rhs),
      desired_variations: constraints.map((c) => c.variation),
    };

    try {
      const response = await fetch("http://127.0.0.1:8000/solve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error("Falha na solicitação");
      }

      const data = (await response.json()) as SimplexOutput;
      setActiveTab("results");
      setResult(data);
    } catch (error) {
      console.error("Erro ao enviar dados:", error);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto mt-10 mb-10">
      <CardHeader>
        <CardTitle>Solver de Programação Linear</CardTitle>
        <CardDescription>
          Insira os dados do seu problema de otimização
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="input">Entrada de Dados</TabsTrigger>
            <TabsTrigger value="results">Resultados</TabsTrigger>
          </TabsList>
          <TabsContent value="input">
            <form className="space-y-6">
              <div className="space-y-2">
                <Label>Tipo de Otimização</Label>
                <RadioGroup
                  defaultValue={maximize ? "maximize" : "minimize"}
                  onValueChange={(value) => setMaximize(value === "maximize")}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="maximize" id="maximize" />
                    <Label htmlFor="maximize">Maximizar</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="minimize" id="minimize" />
                    <Label htmlFor="minimize">Minimizar</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>Número de Variáveis</Label>
                <Select
                  onValueChange={(value) => {
                    const num = parseInt(value);
                    setNumVariables(num);
                    setObjective(new Array(num).fill(0));
                    setConstraints(
                      constraints.map((c) => ({
                        ...c,
                        lhs: new Array(num).fill(0),
                      }))
                    );
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o número de variáveis" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Coeficientes da Função Objetivo</Label>
                <div className="flex space-x-2">
                  {objective.map((coef, index) => (
                    <Input
                      key={index}
                      type="number"
                      value={coef}
                      onChange={(e) =>
                        handleObjectiveChange(index, parseFloat(e.target.value))
                      }
                      placeholder={`x${index + 1}`}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2 p-4 bg-slate-50 rounded-md">
                <Label className="font-medium">Preview das Equações:</Label>

                <div className="mb-2">
                  <span className="font-medium">
                    Função Objetivo ({maximize ? "Max" : "Min"}):{" "}
                  </span>
                  <span className="font-mono">
                    {formatEquation(objective, true)}
                  </span>
                </div>

                <div>
                  <span className="font-medium">Sujeito a:</span>
                  {constraints.map((constraint, index) => (
                    <div key={index} className="font-mono ml-4">
                      {formatEquation(constraint.lhs)} ≤ {constraint.rhs}
                      {constraint.variation !== 0 && (
                        <span className="text-gray-500 ml-2">
                          (Variação: {constraint.variation > 0 ? "+" : ""}
                          {constraint.variation})
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="font-mono ml-4">x₁, x₂ ≥ 0</div>
              </div>

              <div className="space-y-4">
                <Label>Restrições</Label>
                {constraints.map((constraint, constraintIndex) => (
                  <div
                    key={constraintIndex}
                    className="flex items-center space-x-2"
                  >
                    {constraint.lhs.map((coef, varIndex) => (
                      <Input
                        key={varIndex}
                        type="number"
                        value={coef}
                        onChange={(e) =>
                          handleConstraintChange(
                            constraintIndex,
                            varIndex,
                            parseFloat(e.target.value)
                          )
                        }
                        placeholder={`a${constraintIndex + 1}${varIndex + 1}`}
                      />
                    ))}
                    <span>≤</span>
                    <Input
                      type="number"
                      value={constraint.rhs}
                      onChange={(e) =>
                        handleRhsChange(
                          constraintIndex,
                          parseFloat(e.target.value)
                        )
                      }
                      placeholder={`b${constraintIndex + 1}`}
                    />
                    <Label>Variação:</Label>
                    <Input
                      type="number"
                      value={constraint.variation}
                      onChange={(e) =>
                        handleVariationChange(
                          constraintIndex,
                          parseFloat(e.target.value)
                        )
                      }
                      placeholder="Variação"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => removeConstraint(constraintIndex)}
                    >
                      Remover
                    </Button>
                  </div>
                ))}
                <Button type="button" onClick={addConstraint}>
                  Adicionar Restrição
                </Button>
              </div>
            </form>
          </TabsContent>
          <TabsContent value="results">
            {result ? (
              <div className="space-y-4">
                <Alert
                  variant={result.status === 1 ? "default" : "destructive"}
                >
                  <AlertTitle>
                    {result.status === 1 ? "Sucesso" : "Erro"}
                  </AlertTitle>
                  <AlertDescription>{result.message}</AlertDescription>
                </Alert>
                <div>
                  <h4 className="text-sm font-medium mb-2">Valor Ótimo</h4>
                  <p className="text-2xl font-bold">{result.optimal_value}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">Solução</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {result.solution.map((_, idx) => (
                          <TableHead key={idx}>x{idx + 1}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        {result.solution.map((val, idx) => (
                          <TableCell key={idx}>{val}</TableCell>
                        ))}
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">Preços-sombra</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {result.shadow_prices.map((_, idx) => (
                          <TableHead key={idx}>Restrição {idx + 1}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        {result.shadow_prices.map((price, idx) => (
                          <TableCell key={idx}>{price.toFixed(4)}</TableCell>
                        ))}
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">
                    Variações Viáveis
                  </h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {result.variation_viable.map((_, idx) => (
                          <TableHead key={idx}>Restrição {idx + 1}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        {result.variation_viable.map((viable, idx) => (
                          <TableCell key={idx}>
                            {viable ? "Sim" : "Não"}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
                {result.new_optimal_values &&
                  result.new_optimal_values.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">
                        Novos Valores Ótimos
                      </h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {result.new_optimal_values.map((_, idx) => (
                              <TableHead key={idx}>
                                Variação {idx + 1}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            {result.new_optimal_values.map((val, idx) => (
                              <TableCell key={idx}>{val.toFixed(2)}</TableCell>
                            ))}
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  )}
              </div>
            ) : (
              <p>
                Nenhum resultado disponível. Por favor, execute o solver
                primeiro.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSubmit}>Resolver</Button>
      </CardFooter>
    </Card>
  );
}
