import {
  ModelVersionManager,
  DeploymentConfig,
  DeploymentStatus,
  RollbackPlan,
} from '../../../../src/services/learning/ModelVersionManager';

// Mock dependencies
jest.mock('../../../../src/utils/Logger');

describe('ModelVersionManager', () => {
  let versionManager: ModelVersionManager;

  beforeEach(() => {
    versionManager = new ModelVersionManager();
  });

  describe('deployModel', () => {
    it('should start deployment successfully', async () => {
      // Arrange
      const deploymentConfig: DeploymentConfig = {
        modelVersionId: 'model-v1.0',
        environment: 'staging',
        rolloutStrategy: 'immediate',
      };

      // Act
      const deployment = await versionManager.deployModel(
        deploymentConfig
      );

      // Assert
      expect(deployment).toEqual(
        expect.objectContaining({
          id: expect.stringMatching(/^deploy_/),
          modelVersionId: 'model-v1.0',
          environment: 'staging',
          status: 'pending',
          rolloutPercentage: 100,
          startedAt: expect.any(Date),
          healthChecks: [],
        })
      );
    });

    it('should handle gradual rollout strategy', async () => {
      // Arrange
      const deploymentConfig: DeploymentConfig = {
        modelVersionId: 'model-v1.1',
        environment: 'production',
        rolloutStrategy: 'gradual',
        rolloutPercentage: 25,
      };

      // Act
      const deployment = await versionManager.deployModel(
        deploymentConfig
      );

      // Assert
      expect(deployment.rolloutPercentage).toBe(25);
      expect(deployment.status).toBe('pending');
    });

    it('should handle canary deployment', async () => {
      // Arrange
      const deploymentConfig: DeploymentConfig = {
        modelVersionId: 'model-v1.2',
        environment: 'production',
        rolloutStrategy: 'canary',
        rolloutPercentage: 5,
        healthCheckEndpoint: '/health',
        rollbackThreshold: {
          accuracyDrop: 0.05,
          errorRateIncrease: 0.02,
        },
      };

      // Act
      const deployment = await versionManager.deployModel(
        deploymentConfig
      );

      // Assert
      expect(deployment.rolloutPercentage).toBe(5);
    });
  });

  describe('getDeploymentStatus', () => {
    it('should return deployment status if exists', async () => {
      // Arrange
      const deploymentConfig: DeploymentConfig = {
        modelVersionId: 'model-v1.0',
        environment: 'staging',
        rolloutStrategy: 'immediate',
      };
      const deployment = await versionManager.deployModel(
        deploymentConfig
      );

      // Act
      const status = await versionManager.getDeploymentStatus(
        deployment.id
      );

      // Assert
      expect(status).toEqual(deployment);
    });

    it('should return null for non-existent deployment', async () => {
      // Act
      const status = await versionManager.getDeploymentStatus(
        'non-existent-id'
      );

      // Assert
      expect(status).toBeNull();
    });
  });

  describe('listDeployments', () => {
    beforeEach(async () => {
      // Create multiple deployments for testing
      await versionManager.deployModel({
        modelVersionId: 'model-v1.0',
        environment: 'staging',
        rolloutStrategy: 'immediate',
      });

      await versionManager.deployModel({
        modelVersionId: 'model-v1.1',
        environment: 'production',
        rolloutStrategy: 'gradual',
      });

      await versionManager.deployModel({
        modelVersionId: 'model-v1.2',
        environment: 'staging',
        rolloutStrategy: 'canary',
      });
    });

    it('should return all deployments', async () => {
      // Act
      const deployments = await versionManager.listDeployments();

      // Assert
      expect(deployments).toHaveLength(3);
    });

    it('should filter deployments by environment', async () => {
      // Act
      const stagingDeployments = await versionManager.listDeployments(
        {
          environment: 'staging',
        }
      );

      // Assert
      expect(stagingDeployments).toHaveLength(2);
      expect(
        stagingDeployments.every((d) => d.environment === 'staging')
      ).toBe(true);
    });

    it('should filter deployments by status', async () => {
      // Act
      const pendingDeployments = await versionManager.listDeployments(
        {
          status: 'pending',
        }
      );

      // Assert
      expect(
        pendingDeployments.every((d) => d.status === 'pending')
      ).toBe(true);
    });

    it('should limit number of returned deployments', async () => {
      // Act
      const limitedDeployments = await versionManager.listDeployments(
        {
          limit: 2,
        }
      );

      // Assert
      expect(limitedDeployments).toHaveLength(2);
    });
  });

  describe('createRollbackPlan', () => {
    it('should create rollback plan successfully', async () => {
      // Act
      const rollbackPlan = await versionManager.createRollbackPlan(
        'model-v1.1',
        'model-v1.0',
        'Performance degradation detected'
      );

      // Assert
      expect(rollbackPlan).toEqual(
        expect.objectContaining({
          currentVersionId: 'model-v1.1',
          targetVersionId: 'model-v1.0',
          reason: 'Performance degradation detected',
          estimatedDowntime: expect.any(Number),
          rollbackSteps: expect.any(Array),
        })
      );

      expect(rollbackPlan.rollbackSteps.length).toBeGreaterThan(0);
      expect(rollbackPlan.estimatedDowntime).toBeGreaterThan(0);
    });

    it('should include comprehensive rollback steps', async () => {
      // Act
      const rollbackPlan = await versionManager.createRollbackPlan(
        'current-version',
        'target-version',
        'Critical error detected'
      );

      // Assert
      expect(rollbackPlan.rollbackSteps).toContain(
        'Stop traffic to current model version'
      );
      expect(rollbackPlan.rollbackSteps).toContain(
        'Validate target model version availability'
      );
      expect(rollbackPlan.rollbackSteps).toContain(
        'Update routing configuration'
      );
    });
  });

  describe('rollbackModel', () => {
    it('should execute rollback successfully', async () => {
      // Arrange
      const rollbackPlan: RollbackPlan = {
        currentVersionId: 'model-v1.1',
        targetVersionId: 'model-v1.0',
        reason: 'Performance issue',
        estimatedDowntime: 30,
        rollbackSteps: ['Step 1', 'Step 2'],
      };

      // Act
      const rollbackDeployment = await versionManager.rollbackModel(
        rollbackPlan
      );

      // Assert
      expect(rollbackDeployment).toEqual(
        expect.objectContaining({
          modelVersionId: 'model-v1.0',
          environment: 'production',
          status: 'pending',
        })
      );
    });
  });

  describe('getActiveVersion and setActiveVersion', () => {
    it('should return null for domain with no active version', async () => {
      // Act
      const activeVersion = await versionManager.getActiveVersion(
        'legal'
      );

      // Assert
      expect(activeVersion).toBeNull();
    });

    it('should set and get active version', async () => {
      // Act
      await versionManager.setActiveVersion('legal', 'model-v1.0');
      const activeVersion = await versionManager.getActiveVersion(
        'legal'
      );

      // Assert
      expect(activeVersion).toBe('model-v1.0');
    });

    it('should update active version', async () => {
      // Arrange
      await versionManager.setActiveVersion(
        'financial',
        'model-v1.0'
      );

      // Act
      await versionManager.setActiveVersion(
        'financial',
        'model-v1.1'
      );
      const activeVersion = await versionManager.getActiveVersion(
        'financial'
      );

      // Assert
      expect(activeVersion).toBe('model-v1.1');
    });
  });

  describe('performHealthCheck', () => {
    it('should perform health check on deployment', async () => {
      // Arrange
      const deployment = await versionManager.deployModel({
        modelVersionId: 'model-v1.0',
        environment: 'staging',
        rolloutStrategy: 'immediate',
      });

      // Act
      const healthCheck = await versionManager.performHealthCheck(
        deployment.id
      );

      // Assert
      expect(healthCheck).toEqual(
        expect.objectContaining({
          status: expect.stringMatching(/^(healthy|unhealthy)$/),
          metrics: expect.objectContaining({
            responseTime: expect.any(Number),
            accuracy: expect.any(Number),
            errorRate: expect.any(Number),
            throughput: expect.any(Number),
          }),
        })
      );
    });

    it('should throw error for non-existent deployment', async () => {
      // Act & Assert
      await expect(
        versionManager.performHealthCheck('non-existent-id')
      ).rejects.toThrow('Deployment non-existent-id not found');
    });

    it('should record health check in deployment history', async () => {
      // Arrange
      const deployment = await versionManager.deployModel({
        modelVersionId: 'model-v1.0',
        environment: 'staging',
        rolloutStrategy: 'immediate',
      });

      // Act
      await versionManager.performHealthCheck(deployment.id);

      // Assert
      const updatedDeployment =
        await versionManager.getDeploymentStatus(deployment.id);
      expect(updatedDeployment?.healthChecks).toHaveLength(1);
      expect(updatedDeployment?.healthChecks[0]).toEqual(
        expect.objectContaining({
          timestamp: expect.any(Date),
          status: expect.stringMatching(/^(healthy|unhealthy)$/),
          metrics: expect.any(Object),
        })
      );
    });
  });

  describe('monitorDeployment', () => {
    it('should monitor deployment without rollback threshold', async () => {
      // Arrange
      const deployment = await versionManager.deployModel({
        modelVersionId: 'model-v1.0',
        environment: 'staging',
        rolloutStrategy: 'immediate',
      });

      // Simulate deployment completion
      const deploymentStatus =
        await versionManager.getDeploymentStatus(deployment.id);
      if (deploymentStatus) {
        deploymentStatus.status = 'deployed';
      }

      // Act
      await versionManager.monitorDeployment(deployment.id);

      // Assert - Should complete without errors
      const updatedDeployment =
        await versionManager.getDeploymentStatus(deployment.id);
      expect(updatedDeployment?.healthChecks.length).toBeGreaterThan(
        0
      );
    });

    it('should not monitor non-deployed deployment', async () => {
      // Arrange
      const deployment = await versionManager.deployModel({
        modelVersionId: 'model-v1.0',
        environment: 'staging',
        rolloutStrategy: 'immediate',
      });

      // Act (deployment is still pending)
      await versionManager.monitorDeployment(deployment.id);

      // Assert - Should not perform health checks for non-deployed status
      const deploymentStatus =
        await versionManager.getDeploymentStatus(deployment.id);
      expect(deploymentStatus?.status).toBe('pending');
    });
  });

  describe('deployment execution', () => {
    it('should complete immediate deployment', async () => {
      // Arrange
      const deploymentConfig: DeploymentConfig = {
        modelVersionId: 'model-v1.0',
        environment: 'staging',
        rolloutStrategy: 'immediate',
      };

      // Act
      const deployment = await versionManager.deployModel(
        deploymentConfig
      );

      // Wait for deployment to complete
      let completedDeployment: DeploymentStatus | null = null;
      const maxWaitTime = 5000; // 5 seconds
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitTime) {
        completedDeployment =
          await versionManager.getDeploymentStatus(deployment.id);
        if (
          completedDeployment &&
          (completedDeployment.status === 'deployed' ||
            completedDeployment.status === 'failed')
        ) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Assert
      expect(completedDeployment).toBeTruthy();
      expect(['deployed', 'failed']).toContain(
        completedDeployment!.status
      );

      if (completedDeployment!.status === 'deployed') {
        expect(completedDeployment!.rolloutPercentage).toBe(100);
        expect(completedDeployment!.completedAt).toBeTruthy();
      }
    }, 10000); // 10 second timeout
  });
});
