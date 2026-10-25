export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  language: string | null;
  pushed_at: string;
  default_branch: string;
  size: number;
  fork: boolean;
  open_issues_count: number;
  topics: string[];
}

export interface RepositoryAnalysis {
  architecture: string;
  databaseConventions: string[];
  namingConventions: string[];
  apiConventions: string[];
  testingConventions: string[];
  errorHandling: string;
  authentication: string;
  commonPatterns: string[];
  forbiddenPatterns: string[];
  responseHelpers: string[];
  repositoryStructure: string[];
}

export interface SkillFromAnalysis {
  name: string;
  description: string;
  instructions: string;
  rules: string[];
  examples: Array<{ title: string; description: string; input: string; output: string; code: string }>;
  antiPatterns: string[];
  context: string;
  tags: string[];
  technology: string;
  compatiblePlatforms: string[];
}

export class GitHubService {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  async getRepository(owner: string, repo: string): Promise<GitHubRepository> {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      {
        headers: {
          Authorization: `token ${this.token}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    return response.json();
  }

  async getRepositoryTree(
    owner: string,
    repo: string,
    branch: string = "main"
  ): Promise<any> {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
      {
        headers: {
          Authorization: `token ${this.token}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    return response.json();
  }

  async analyzeRepository(owner: string, repo: string): Promise<RepositoryAnalysis> {
    const repoData = await this.getRepository(owner, repo);
    const tree = await this.getRepositoryTree(owner, repo, repoData.default_branch);

    const analysis: RepositoryAnalysis = {
      architecture: this.detectArchitecture(repoData, tree),
      databaseConventions: this.detectDatabaseConventions(tree),
      namingConventions: this.detectNamingConventions(tree),
      apiConventions: this.detectApiConventions(tree),
      testingConventions: this.detectTestingConventions(tree),
      errorHandling: this.detectErrorHandling(tree),
      authentication: this.detectAuthentication(repoData),
      commonPatterns: this.detectCommonPatterns(tree),
      forbiddenPatterns: this.detectForbiddenPatterns(tree),
      responseHelpers: this.detectResponseHelpers(tree),
      repositoryStructure: this.detectRepositoryStructure(tree),
    };

    return analysis;
  }

  private detectArchitecture(repo: GitHubRepository, tree: any): string {
    const dirs: string[] = [];
    for (const item of tree.tree) {
      if (item.type === "tree") {
        dirs.push(item.path.split("/")[0]);
      }
    }

    if (dirs.includes("src") || dirs.includes("app")) return "Standard framework";
    if (dirs.includes("controllers") || dirs.includes("api")) return "Backend API";
    if (dirs.includes("module")) return "Monorepo";
    return "Unknown";
  }

  private detectDatabaseConventions(tree: any): string[] {
    const conventions: string[] = [];
    const filenames = tree.map((t: any) => t.path?.toLowerCase() || "");

    if (filenames.some((f: string) => f.includes("migration"))) {
      conventions.push("Uses migration files");
    }
    if (filenames.some((f: string) => f.includes("schema"))) {
      conventions.push("Has schema definitions");
    }
    if (filenames.some((f: string) => f.includes("prisma"))) {
      conventions.push("Prisma ORM");
    }
    if (filenames.some((f: string) => f.includes("sql"))) {
      conventions.push("Raw SQL files");
    }

    return conventions;
  }

  private detectNamingConventions(tree: any): string[] {
    const conventions: string[] = [];
    const filenames = tree.map((t: any) => t.path?.toLowerCase() || "");

    if (filenames.some((f: string) => f.includes("camel"))) {
      conventions.push("CamelCase");
    }
    if (filenames.some((f: string) => f.includes("snake"))) {
      conventions.push("snake_case");
    }
    if (filenames.some((f: string) => f.includes("kebab"))) {
      conventions.push("kebab-case");
    }
    if (filenames.some((f: string) => f.includes("pascal"))) {
      conventions.push("PascalCase");
    }

    return conventions;
  }

  private detectApiConventions(tree: any): string[] {
    const conventions: string[] = [];
    const filenames = tree.map((t: any) => t.path?.toLowerCase() || "");

    if (filenames.some((f: string) => f.includes("express")) || filenames.some((f: string) => f.includes("app"))) {
      conventions.push("Express-style middleware");
    }
    if (filenames.some((f: string) => f.includes("route")) || filenames.some((f: string) => f.includes("endpoint"))) {
      conventions.push("Explicit route handlers");
    }
    if (filenames.some((f: string) => f.includes("zod")) || filenames.some((f: string) => f.includes("yup"))) {
      conventions.push("Input validation with schema");
    }
    if (filenames.some((f: string) => f.includes("api"))) {
      conventions.push("RESTful API conventions");
    }

    return conventions;
  }

  private detectTestingConventions(tree: any): string[] {
    const conventions: string[] = [];
    const filenames = tree.map((t: any) => t.path?.toLowerCase() || "");

    if (filenames.some((f: string) => f.includes("jest"))) {
      conventions.push("Jest test framework");
    }
    if (filenames.some((f: string) => f.includes("pytest"))) {
      conventions.push("Pytest test framework");
    }
    if (filenames.some((f: string) => f.includes("mocha"))) {
      conventions.push("Mocha test framework");
    }
    if (filenames.some((f: string) => f.includes("vitest"))) {
      conventions.push("Vitest test framework");
    }

    return conventions;
  }

  private detectErrorHandling(tree: any): string {
    const filenames = tree.map((t: any) => t.path?.toLowerCase() || "");
    if (filenames.some((f: string) => f.includes("try"))) {
      return "Try/catch error handling";
    }
    return "Error handling patterns";
  }

  private detectAuthentication(repo: GitHubRepository): string {
    if (repo.private) {
      return "Internal authentication required";
    }
    if (repo.topics?.includes("auth") || repo.topics?.includes("oauth")) {
      return "OAuth2 authentication";
    }
    return "Standard session-based auth";
  }

  private detectCommonPatterns(tree: any): string[] {
    const patterns: string[] = [];
    const filenames = tree.map((t: any) => t.path?.toLowerCase() || "");

    if (filenames.some((f: string) => f.includes("service"))) {
      patterns.push("Service layer pattern");
    }
    if (filenames.some((f: string) => f.includes("repository"))) {
      patterns.push("Repository pattern");
    }
    if (filenames.some((f: string) => f.includes("middleware"))) {
      patterns.push("Express middleware");
    }
    if (filenames.some((f: string) => f.includes("helper"))) {
      patterns.push("Helper functions");
    }

    return patterns;
  }

  private detectForbiddenPatterns(tree: any): string[] {
    const patterns: string[] = [];
    const filenames = tree.map((t: any) => t.path?.toLowerCase() || "");

    if (filenames.some((f: string) => f.includes("db.") || filenames.some((f: string) => f.includes("rawsql")))) {
      patterns.push("Direct database queries");
    }

    return patterns;
  }

  private detectResponseHelpers(tree: any): string[] {
    const helpers: string[] = [];
    const filenames = tree.map((t: any) => t.path?.toLowerCase() || "");

    if (filenames.some((f: string) => f.includes("response"))) {
      helpers.push("Response helper");
    }
    if (filenames.some((f: string) => f.includes("apiResponse"))) {
      helpers.push("API response formatter");
    }
    if (filenames.some((f: string) => f.includes("success"))) {
      helpers.push("Success response handler");
    }

    return helpers;
  }

  private detectRepositoryStructure(tree: any): string[] {
    const structure: string[] = [];
    const dirs = new Set<string>();

    for (const item of tree.tree) {
      if (item.type === "tree") {
        const parts = item.path.split("/");
        if (parts.length > 0) {
          dirs.add(parts[0]);
        }
      }
    }

    for (const dir of dirs) {
      structure.push(dir);
    }

    return structure;
  }

  async generateSkillFromAnalysis(owner: string, repo: string): Promise<SkillFromAnalysis> {
    const analysis = await this.analyzeRepository(owner, repo);
    const tech = this.detectTechnology(await this.getRepository(owner, repo));

    const skill: SkillFromAnalysis = {
      name: repo.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim(),
      description: `Best practices for ${tech} development based on repository analysis`,
      instructions: `This skill contains patterns and conventions detected from the repository at \`${owner}/${repo}\`. Follow these guidelines when working with similar codebases.`,

      rules: this.generateRulesFromAnalysis(analysis),

      examples: this.generateExamples(tech),

      antiPatterns: this.generateAntiPatternsFromAnalysis(analysis),

      context: `Repository: ${owner}/${repo}\nArchitecture: ${analysis.architecture}\nTechnology: ${tech}\n\nConventions detected from codebase analysis.`,

      tags: this.generateTags(tech, analysis),

      technology: tech,

      compatiblePlatforms: this.detectCompatiblePlatforms(tech),
    };

    return skill;
  }

  private detectTechnology(repo: GitHubRepository): string {
    const lang = repo.language;
    if (lang === "TypeScript" || lang === "JavaScript") return "JavaScript/TypeScript";
    if (lang === "Python") return "Python";
    if (lang === "PHP") return "PHP";
    if (lang === "Go") return "Go";
    if (lang === "Java") return "Java";
    if (lang === "C#") return "C#";

    if (repo.topics?.includes("nextjs") || repo.topics?.includes("react")) return "JavaScript/TypeScript";
    if (repo.topics?.includes("python")) return "Python";
    return lang || "Unknown";
  }

  private generateRulesFromAnalysis(analysis: RepositoryAnalysis): string[] {
    const rules: string[] = [];

    if (analysis.commonPatterns.includes("Repository pattern")) {
      rules.push("1. Use repository classes for database access");
      rules.push("2. Do not query the database directly from controllers/handlers");
    }

    if (analysis.commonPatterns.includes("Service layer pattern")) {
      rules.push("3. Place business logic in service layers");
      rules.push("4. Keep controllers/handlers thin");
    }

    if (analysis.commonPatterns.includes("Express middleware")) {
      rules.push("5. Use Express middleware for request preprocessing");
    }

    if (analysis.commonPatterns.includes("Helper functions")) {
      rules.push("6. Reuse existing response helpers instead of returning arrays directly");
    }

    if (analysis.forbiddenPatterns.includes("Direct database queries")) {
      rules.push("7. Do not execute raw SQL queries without parameterized statements");
    }

    return rules;
  }

  private generateExamples(tech: string): Array<{ title: string; description: string; input: string; output: string; code: string }> {
    const examples: Array<{ title: string; description: string; input: string; output: string; code: string }> = [];

    if (tech.includes("JavaScript") || tech.includes("TypeScript")) {
      examples.push({
        title: "API Endpoint with Repository",
        description: "Create an endpoint that uses the repository pattern",
        input: "POST /users - Create a new user",
        output: "User object with id and name",
        code:
          "// Good example\\nimport { Repository } from '@/repo/UserRepository';\\nasync function createUser(req, res) {\\n  const user = await Repository.create({ name: req.body.name, email: req.body.email });\\n  res.json(user);\\n}\\n\\n// Bad example\\nasync function createUserBad(req, res) {\\n  const user = await db.query(`INSERT INTO users SET ?`, [req.body]);\\n  res.json(user);\\n",
      });
    }

    if (tech.includes("Python")) {
      examples.push({
        title: "Service Layer Pattern",
        description: "Create an endpoint that uses the service pattern",
        input: "POST /api/users - Create a new user",
        output: "User created successfully",
        code:
          "# Good example\\nfrom app.services.user_service import UserService\\n\\n@router.post('/users')\\ndef create_user(request):\\n    user = UserService.create(request.data)\\n    return jsonify(user)\\n\\n# Bad example\\nasync function createUserBad(request):\\n    db.query('INSERT INTO users SET ?', [request.data])\\n    return jsonify(request.data)\\n",
      });
    }

    return examples;
  }

  private generateAntiPatternsFromAnalysis(analysis: RepositoryAnalysis): string[] {
    const patterns: string[] = [];

    if (analysis.forbiddenPatterns.includes("Direct database queries")) {
      patterns.push("1. Do not query the database directly from controllers/handlers");
      patterns.push("2. Do not execute raw SQL without parameterized statements");
    }

    if (analysis.commonPatterns.includes("Service layer pattern") === false) {
      patterns.push("3. Avoid putting business logic in API handlers");
    }

    if (analysis.commonPatterns.includes("Repository pattern") === false) {
      patterns.push("4. Consider using repository classes for data access");
    }

    return patterns;
  }

  private generateTags(tech: string, analysis: RepositoryAnalysis): string[] {
    const tags: string[] = [tech?.toLowerCase() || "unknown"];

    if (analysis.commonPatterns.includes("Repository pattern")) {
      tags.push("repository");
    }
    if (analysis.commonPatterns.includes("Service layer pattern")) {
      tags.push("service-layer");
    }
    if (analysis.commonPatterns.includes("Express middleware")) {
      tags.push("express");
    }
    if (analysis.commonPatterns.includes("Error handling")) {
      tags.push("error-handling");
    }

    return tags;
  }

  private detectCompatiblePlatforms(tech: string): string[] {
    const platforms: string[] = [];

    if (tech.includes("JavaScript") || tech.includes("TypeScript")) {
      platforms.push("opencode");
      platforms.push("cursor");
    }
    if (tech.includes("Python")) {
      platforms.push("opencode");
    }

    return platforms;
  }
}